import type { Card, Env } from '../types';
import { MockCompsProvider, summarizeComps } from '../lib/comps';
import { queryAll, queryOne, run } from '../lib/db';
import { badRequest, notFound, ok } from '../lib/json';

const provider = new MockCompsProvider();

export async function getComps(env: Env, cardId: number): Promise<Response> {
  const card = await queryOne<Card>(env.DB, 'SELECT * FROM cards WHERE id = ?', [cardId]);
  if (!card) return notFound('Card not found');

  const comps = await queryAll<any>(
    env.DB,
    `SELECT id, source, title, sold_price_cents, sold_date, sold_platform, listing_url, condition_text, created_at
     FROM sales_comps
     WHERE card_id = ?
     ORDER BY sold_date DESC, id DESC
     LIMIT 50`,
    [cardId],
  );

  const summary = summarizeComps(comps.map((c) => Number(c.sold_price_cents)));
  return ok({ card, summary, recent_sales: comps });
}

export async function refreshComps(env: Env, cardId: number): Promise<Response> {
  const card = await queryOne<Card>(env.DB, 'SELECT * FROM cards WHERE id = ?', [cardId]);
  if (!card) return notFound('Card not found');

  const comps = await provider.fetchRecentSales(card);
  if (!comps.length) return badRequest('Provider returned no comps');

  await run(env.DB, 'DELETE FROM sales_comps WHERE card_id = ?', [cardId]);

  const statements = comps.map((comp) =>
    env.DB
      .prepare(
        `INSERT INTO sales_comps (card_id, source, title, sold_price_cents, sold_date, sold_platform, listing_url, condition_text)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        cardId,
        comp.source,
        comp.title,
        comp.sold_price_cents,
        comp.sold_date,
        comp.sold_platform,
        comp.listing_url,
        comp.condition_text,
      ),
  );

  await env.DB.batch(statements);

  const summary = summarizeComps(comps.map((c) => c.sold_price_cents));
  return ok({
    provider: provider.name,
    card_id: cardId,
    inserted: comps.length,
    summary,
    note: 'Mock provider used. Replace provider implementation for live marketplace integrations.',
  });
}
