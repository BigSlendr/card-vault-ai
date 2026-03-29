import type { Env, User } from '../types';
import { queryOne, run } from '../lib/db';
import { badRequest, notFound, ok, serverError } from '../lib/json';
import { asInt, asString, parseJsonBody } from '../lib/validation';
import { identifyCard, r2KeyToDataUrl, type CardIdentification } from '../lib/vision';

interface CollectionItemRow {
  id: number;
  user_id: number;
  front_image_url: string | null;
}

interface PendingIdentificationRow {
  id: number;
  collection_item_id: number;
  suggestions: string;
  confirmed: number;
}

// ── POST /api/vision/identify ─────────────────────────────────────────────────

export async function identifyCollectionItem(env: Env, request: Request, user: User): Promise<Response> {
  const body = await parseJsonBody<{ collectionItemId?: unknown }>(request);
  if (body instanceof Response) return body;

  const collectionItemId = Number(body.collectionItemId);
  if (!Number.isInteger(collectionItemId) || collectionItemId <= 0) {
    return badRequest('collectionItemId must be a positive integer');
  }

  const item = await queryOne<CollectionItemRow>(
    env.DB,
    'SELECT id, user_id, front_image_url FROM collection_items WHERE id = ? AND user_id = ?',
    [collectionItemId, user.id],
  );
  if (!item) return notFound('Collection item not found');
  if (!item.front_image_url) return badRequest('Collection item has no front image — upload one first');

  // front_image_url is an R2 key; read bytes and encode as base64 data URL
  const dataUrl = await r2KeyToDataUrl(env, item.front_image_url);
  if (!dataUrl) return badRequest('Front image not found in storage — re-upload the image');

  const identification = await identifyCard(env, dataUrl);

  await run(
    env.DB,
    `INSERT INTO pending_identifications (collection_item_id, suggestions, confirmed)
     VALUES (?, ?, 0)`,
    [collectionItemId, JSON.stringify(identification)],
  );

  return ok({ collection_item_id: collectionItemId, identification }, 201);
}

// ── POST /api/vision/confirm/:collectionItemId ────────────────────────────────

export async function confirmIdentification(
  env: Env,
  request: Request,
  user: User,
  collectionItemId: number,
): Promise<Response> {
  const item = await queryOne<CollectionItemRow>(
    env.DB,
    'SELECT id FROM collection_items WHERE id = ? AND user_id = ?',
    [collectionItemId, user.id],
  );
  if (!item) return notFound('Collection item not found');

  const pending = await queryOne<PendingIdentificationRow>(
    env.DB,
    `SELECT id FROM pending_identifications
     WHERE collection_item_id = ? AND confirmed = 0
     ORDER BY created_at DESC, id DESC
     LIMIT 1`,
    [collectionItemId],
  );
  if (!pending) return notFound('No pending identification found for this item');

  const body = await parseJsonBody<Partial<CardIdentification>>(request);
  if (body instanceof Response) return body;

  try {
    const playerName    = asString(body.player_name,    'player_name',    200);
    const setName       = asString(body.set_name,       'set_name',       200);
    const cardNumber    = asString(body.card_number,    'card_number',     50);
    const sport         = asString(body.sport,          'sport',          100);
    const variation     = asString(body.variation,      'variation',      200);
    const manufacturer  = asString(body.manufacturer,   'manufacturer',   100);
    const conditionNote = asString(body.condition_notes,'condition_notes',1000);
    const year          = asInt(body.year,              'year',           1800, 2100);

    // Build the card_name from what we know: prefer player_name, fallback to set_name or generic
    const cardName = playerName ?? setName ?? 'Unknown Card';
    const game     = sport ?? 'Unknown';

    // Build a deduplication-friendly external_ref from the most stable identifiers
    const externalRef = [manufacturer, year != null ? String(year) : null, cardNumber]
      .filter(Boolean)
      .join(':') || null;

    // Try to find an existing card with the same logical identity to avoid duplicates
    const existingCard = await queryOne<{ id: number }>(
      env.DB,
      `SELECT id FROM cards
       WHERE card_name = ?
         AND game = ?
         AND COALESCE(set_name, '') = COALESCE(?, '')
         AND COALESCE(card_number, '') = COALESCE(?, '')
       LIMIT 1`,
      [cardName, game, setName, cardNumber],
    );

    let cardId: number;

    if (existingCard) {
      cardId = existingCard.id;
    } else {
      await run(
        env.DB,
        `INSERT INTO cards (game, set_name, card_name, card_number, rarity, image_url, external_ref)
         VALUES (?, ?, ?, ?, ?, NULL, ?)`,
        [game, setName, cardName, cardNumber, variation, externalRef],
      );

      const newCard = await queryOne<{ id: number }>(
        env.DB,
        'SELECT id FROM cards WHERE id = last_insert_rowid()',
      );
      if (!newCard) return serverError('Failed to create card record');
      cardId = newCard.id;
    }

    // Link the collection item to the card and persist any condition notes
    await run(
      env.DB,
      `UPDATE collection_items
       SET card_id = ?, condition_note = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [cardId, conditionNote, collectionItemId, user.id],
    );

    // Mark all unconfirmed pending identifications for this item as confirmed
    await run(
      env.DB,
      `UPDATE pending_identifications
       SET confirmed = 1
       WHERE collection_item_id = ? AND confirmed = 0`,
      [collectionItemId],
    );

    return ok({ card_id: cardId, collection_item_id: collectionItemId, confirmed: true });
  } catch (err) {
    return badRequest(err instanceof Error ? err.message : 'Invalid confirmation payload');
  }
}
