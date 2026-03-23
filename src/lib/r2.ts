import type { Env } from '../types';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;

export function getCardImageKey(userId: number, collectionItemId: number, side: 'front' | 'back', mimeType: string): string {
  const extension = mimeTypeToExtension(mimeType);
  return `user-${userId}/collection-${collectionItemId}/${side}.${extension}`;
}

export async function uploadCardImage(
  env: Env,
  key: string,
  contentType: string,
  data: ArrayBuffer,
): Promise<{ key: string; size: number; contentType: string }> {
  validateImage(contentType, data.byteLength);

  // Future pipeline: trigger image resizing and preprocessing before ML inference.
  await env.BUCKET.put(key, data, {
    httpMetadata: { contentType },
  });

  return { key, size: data.byteLength, contentType };
}

export async function deleteCardImage(env: Env, key: string): Promise<void> {
  await env.BUCKET.delete(key);
}

export function validateImage(contentType: string, size: number): void {
  if (!ALLOWED_MIME_TYPES.has(contentType)) {
    throw new Error('Unsupported image type. Use JPEG, PNG, or WEBP.');
  }
  if (size <= 0 || size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`Image must be between 1 byte and ${MAX_FILE_SIZE_BYTES} bytes`);
  }
}

function mimeTypeToExtension(mimeType: string): string {
  switch (mimeType) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    default:
      throw new Error('Unsupported mime type');
  }
}
