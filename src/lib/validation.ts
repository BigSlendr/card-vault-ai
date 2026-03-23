import { badRequest } from './json';

export async function parseJsonBody<T>(request: Request): Promise<T | Response> {
  try {
    return (await request.json()) as T;
  } catch {
    return badRequest('Invalid JSON body');
  }
}

export function asString(value: unknown, field: string, maxLen: number, required = false): string | null {
  if (value == null || value === '') {
    if (required) {
      throw new Error(`${field} is required`);
    }
    return null;
  }

  if (typeof value !== 'string') {
    throw new Error(`${field} must be a string`);
  }

  const trimmed = value.trim();
  if (!trimmed && required) {
    throw new Error(`${field} is required`);
  }
  if (trimmed.length > maxLen) {
    throw new Error(`${field} exceeds max length of ${maxLen}`);
  }

  return trimmed || null;
}

export function asInt(value: unknown, field: string, min: number, max: number, required = false): number | null {
  if (value == null || value === '') {
    if (required) {
      throw new Error(`${field} is required`);
    }
    return null;
  }

  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new Error(`${field} must be an integer`);
  }
  if (value < min || value > max) {
    throw new Error(`${field} must be between ${min} and ${max}`);
  }

  return value;
}

export function asEmail(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error('email is required');
  }
  const email = value.trim().toLowerCase();
  if (email.length < 5 || email.length > 254) {
    throw new Error('email length is invalid');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('email format is invalid');
  }
  return email;
}
