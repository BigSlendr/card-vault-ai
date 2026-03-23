export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
}

export interface User {
  id: number;
  email: string;
  username: string | null;
  created_at: string;
}

export interface Session {
  id: string;
  user_id: number;
  expires_at: string;
}

export interface Card {
  id: number;
  game: string;
  set_name: string | null;
  card_name: string;
  card_number: string | null;
  rarity: string | null;
  image_url: string | null;
  external_ref: string | null;
  created_at: string;
  updated_at: string;
}
