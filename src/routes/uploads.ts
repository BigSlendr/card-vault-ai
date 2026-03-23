import type { Env, User } from '../types';
import { queryOne, run } from '../lib/db';
import { badRequest, notFound, ok } from '../lib/json';
import { getCardImageKey, uploadCardImage } from '../lib/r2';

export async function uploadDirect(env: Env, request: Request, user: User): Promise<Response> {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('multipart/form-data')) {
    return badRequest('Content-Type must be multipart/form-data');
  }

  const form = await request.formData();
  const file = form.get('file');
  const side = form.get('side');
  const collectionItemIdRaw = form.get('collectionItemId');

  if (!(file instanceof File)) {
    return badRequest('file is required');
  }
  if (side !== 'front' && side !== 'back') {
    return badRequest('side must be front or back');
  }
  if (typeof collectionItemIdRaw !== 'string' || !/^\d+$/.test(collectionItemIdRaw)) {
    return badRequest('collectionItemId must be a positive integer string');
  }

  const collectionItemId = Number(collectionItemIdRaw);
  const item = await queryOne(env.DB, 'SELECT id FROM collection_items WHERE id = ? AND user_id = ?', [collectionItemId, user.id]);
  if (!item) return notFound('Collection item not found');

  const key = getCardImageKey(user.id, collectionItemId, side, file.type);
  const data = await file.arrayBuffer();

  try {
    const uploaded = await uploadCardImage(env, key, file.type, data);
    const column = side === 'front' ? 'front_image_url' : 'back_image_url';

    await run(
      env.DB,
      `UPDATE collection_items SET ${column} = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`,
      [uploaded.key, collectionItemId, user.id],
    );

    return ok({
      collection_item_id: collectionItemId,
      side,
      key: uploaded.key,
      content_type: uploaded.contentType,
      size: uploaded.size,
      note: 'Store key and serve through a signed URL or CDN route in production.',
    });
  } catch (err) {
    return badRequest(err instanceof Error ? err.message : 'Upload failed');
  }
}
