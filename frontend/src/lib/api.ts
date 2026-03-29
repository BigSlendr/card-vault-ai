import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8787',
  withCredentials: true,
});

// ── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: number;
  email: string;
  username: string | null;
  created_at: string;
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

export interface CollectionItem {
  id: number;
  user_id: number;
  card_id: number | null;
  quantity: number;
  condition_note: string | null;
  estimated_grade: string | null;
  estimated_value_cents: number | null;
  front_image_url: string | null;
  back_image_url: string | null;
  // joined fields from cards table
  game?: string;
  set_name?: string | null;
  card_name?: string | null;
  card_number?: string | null;
  rarity?: string | null;
}

export interface SalesComp {
  id?: number;
  source: string;
  title: string;
  sold_price_cents: number;
  sold_date: string;
  sold_platform: string;
  listing_url: string | null;
  condition_text: string | null;
  created_at: string;
}

export interface CompsSummary {
  count: number;
  low_price_cents: number | null;
  average_price_cents: number | null;
  high_price_cents: number | null;
}

export interface CompsResult {
  sold: SalesComp[];
  active: SalesComp[];
  summary: CompsSummary;
  cached: boolean;
  last_synced: string;
}

export interface RefreshCompsResult {
  card_id: number;
  inserted: { sold: number; active: number };
  summary: CompsSummary;
  cached: boolean;
  last_synced: string;
}

export interface GradeComponentScore {
  score: number;
  label: string;
}

export interface GradingEstimate {
  estimated_grade_range: string;
  centering: GradeComponentScore;
  corners: GradeComponentScore;
  edges: GradeComponentScore;
  surface: GradeComponentScore;
  confidence: number;
  explanation: string;
}

export interface GradingEstimateRecord extends GradingEstimate {
  id: number;
  collection_item_id: number;
  centering_score: number;
  corners_score: number;
  edges_score: number;
  surface_score: number;
  confidence_score: number;
  created_at: string;
  label: string;
  non_official: boolean;
}

export interface CardIdentification {
  player_name: string | null;
  year: number | null;
  set_name: string | null;
  card_number: string | null;
  sport: string | null;
  variation: string | null;
  manufacturer: string | null;
  condition_notes: string | null;
  confidence: number;
  raw_response: string;
}

export interface PendingCollectionItem extends CollectionItem {
  pending_id: number;
  suggestions: CardIdentification | null;
}

export interface IdentifyResult {
  collection_item_id: number;
  identification: CardIdentification;
}

export interface ConfirmResult {
  card_id: number;
  collection_item_id: number;
  confirmed: boolean;
}

export interface UploadResult {
  collection_item_id: number;
  side: 'front' | 'back';
  key: string;
  content_type: string;
  size: number;
  note: string;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export const auth = {
  register: (email: string, password: string, username?: string) =>
    client.post<User>('/api/auth/register', { email, password, username }).then((r) => r.data),

  login: (email: string, password: string) =>
    client.post<User>('/api/auth/login', { email, password }).then((r) => r.data),

  logout: () =>
    client.post<{ logged_out: boolean }>('/api/auth/logout').then((r) => r.data),

  me: () =>
    client.get<User>('/api/auth/me').then((r) => r.data),
};

// ── Cards ────────────────────────────────────────────────────────────────────

export interface ListCardsParams {
  game?: string;
  set_name?: string;
  card_name?: string;
}

export interface CreateCardPayload {
  game: string;
  set_name?: string;
  card_name: string;
  card_number?: string;
  rarity?: string;
  image_url?: string;
  external_ref?: string;
}

export const cards = {
  list: (params?: ListCardsParams) =>
    client.get<Card[]>('/api/cards', { params }).then((r) => r.data),

  get: (id: number) =>
    client.get<Card>(`/api/cards/${id}`).then((r) => r.data),

  create: (payload: CreateCardPayload) =>
    client.post<Card>('/api/cards', payload).then((r) => r.data),

  update: (id: number, payload: Partial<CreateCardPayload>) =>
    client.put<Card>(`/api/cards/${id}`, payload).then((r) => r.data),

  delete: (id: number) =>
    client.delete<{ deleted: boolean }>(`/api/cards/${id}`).then((r) => r.data),
};

// ── Collection ───────────────────────────────────────────────────────────────

export interface CreateCollectionItemPayload {
  card_id?: number;
  quantity?: number;
  condition_note?: string;
  estimated_grade?: string;
  estimated_value_cents?: number;
}

export interface UpdateCollectionItemPayload extends CreateCollectionItemPayload {
  front_image_url?: string;
  back_image_url?: string;
}

export const collection = {
  list: (params?: { unconfirmed?: boolean }) =>
    client.get<CollectionItem[]>('/api/collection', {
      params: params?.unconfirmed ? { unconfirmed: '1' } : undefined,
    }).then((r) => r.data),

  get: (id: number) =>
    client.get<CollectionItem>(`/api/collection/${id}`).then((r) => r.data),

  create: (payload: CreateCollectionItemPayload) =>
    client.post<CollectionItem>('/api/collection', payload).then((r) => r.data),

  update: (id: number, payload: UpdateCollectionItemPayload) =>
    client.put<CollectionItem>(`/api/collection/${id}`, payload).then((r) => r.data),

  delete: (id: number) =>
    client.delete<{ deleted: boolean }>(`/api/collection/${id}`).then((r) => r.data),
};

// ── Uploads ──────────────────────────────────────────────────────────────────

export const uploads = {
  uploadDirect: (collectionItemId: number, side: 'front' | 'back', file: File) => {
    const form = new FormData();
    form.append('collectionItemId', String(collectionItemId));
    form.append('side', side);
    form.append('file', file);
    return client.post<UploadResult>('/api/uploads/direct', form).then((r) => r.data);
  },
};

// ── Comps ────────────────────────────────────────────────────────────────────

export const comps = {
  getComps: (cardId: number) =>
    client.get<CompsResult>(`/api/comps/${cardId}`).then((r) => r.data),

  refreshComps: (cardId: number) =>
    client.post<RefreshCompsResult>(`/api/comps/${cardId}/refresh`).then((r) => r.data),

  search: (q: string) =>
    client.get<CompsResult>('/api/comps/search', { params: { q } }).then((r) => r.data),
};

// ── Vision ───────────────────────────────────────────────────────────────────

export const vision = {
  identify: (collectionItemId: number) =>
    client.post<IdentifyResult>('/api/vision/identify', { collectionItemId }).then((r) => r.data),

  confirm: (collectionItemId: number, fields: Partial<CardIdentification>) =>
    client.post<ConfirmResult>(`/api/vision/confirm/${collectionItemId}`, fields).then((r) => r.data),
};

// ── Grading ──────────────────────────────────────────────────────────────────

export const grading = {
  estimateGrade: (collectionItemId: number) =>
    client.post<GradingEstimate>('/api/grading/estimate', { collectionItemId }).then((r) => r.data),

  getLatestGrade: (collectionItemId: number) =>
    client.get<GradingEstimateRecord>(`/api/grading/${collectionItemId}/latest`).then((r) => r.data),
};
