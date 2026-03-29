import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  comps,
  vision,
  type CardIdentification,
  type CollectionItem,
  type CompsResult,
  type PendingCollectionItem,
} from '../lib/api';

// ── Confidence badge ──────────────────────────────────────────────────────────

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const color =
    confidence >= 80 ? 'var(--good)' : confidence >= 60 ? 'var(--warn)' : 'var(--danger)';
  const label = confidence >= 80 ? 'High' : confidence >= 60 ? 'Medium' : 'Low';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px',
      borderRadius: 20, fontSize: 12, fontWeight: 700,
      background: `${color}22`, color, border: `1px solid ${color}44`,
    }}>
      {label} confidence &middot; {confidence}%
    </span>
  );
}

// ── Per-item review card ──────────────────────────────────────────────────────

const FIELD_DEFS = [
  { key: 'player_name',  label: 'Player / Name' },
  { key: 'set_name',     label: 'Set' },
  { key: 'year',         label: 'Year' },
  { key: 'card_number',  label: 'Card #' },
  { key: 'sport',        label: 'Sport / Game' },
  { key: 'manufacturer', label: 'Manufacturer' },
  { key: 'variation',    label: 'Variation' },
] as const;

type EditableFields = Record<typeof FIELD_DEFS[number]['key'] | 'condition_notes', string>;

function initialFields(s: CardIdentification | null): EditableFields {
  return {
    player_name:     s?.player_name     ?? '',
    set_name:        s?.set_name        ?? '',
    year:            s?.year != null    ? String(s.year) : '',
    card_number:     s?.card_number     ?? '',
    sport:           s?.sport           ?? '',
    manufacturer:    s?.manufacturer    ?? '',
    variation:       s?.variation       ?? '',
    condition_notes: s?.condition_notes ?? '',
  };
}

interface ReviewCardProps {
  item: PendingCollectionItem;
  onDone: (id: number) => void;
}

function ReviewCard({ item, onDone }: ReviewCardProps) {
  const queryClient = useQueryClient();
  const [fields, setFields] = useState<EditableFields>(() => initialFields(item.suggestions));
  const [compsData, setCompsData] = useState<CompsResult | null>(null);
  const [fetchingComps, setFetchingComps] = useState(false);
  const [compsError, setCompsError] = useState<string | null>(null);

  function set(key: keyof EditableFields, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  const confirmMutation = useMutation({
    mutationFn: () =>
      vision.confirm(item.id, {
        player_name:     fields.player_name     || null,
        year:            fields.year ? Number(fields.year) : null,
        set_name:        fields.set_name        || null,
        card_number:     fields.card_number     || null,
        sport:           fields.sport           || null,
        variation:       fields.variation       || null,
        manufacturer:    fields.manufacturer    || null,
        condition_notes: fields.condition_notes || null,
      } as Partial<CardIdentification>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection'] });
      onDone(item.id);
    },
  });

  const discardMutation = useMutation({
    mutationFn: () => collection.delete(item.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection'] });
      onDone(item.id);
    },
  });

  async function fetchComps() {
    const q = fields.player_name.trim() || fields.set_name.trim();
    if (!q) return;
    setFetchingComps(true);
    setCompsError(null);
    try {
      const result = await comps.search(q);
      setCompsData(result);
    } catch (err) {
      setCompsError(err instanceof Error ? err.message : 'Failed to fetch comps');
    } finally {
      setFetchingComps(false);
    }
  }

  const isBusy = confirmMutation.isPending || discardMutation.isPending;
  const canFetchComps = !fetchingComps && (fields.player_name.trim() || fields.set_name.trim());

  return (
    <div className="cv-surface" style={{ borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ padding: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 24 }}>

          {/* Image */}
          <div>
            {item.front_image_url ? (
              <img
                src={item.front_image_url}
                alt="Card front"
                style={{ width: '100%', borderRadius: 8, display: 'block', border: '1px solid var(--border)' }}
              />
            ) : (
              <div style={{
                aspectRatio: '2/3', background: 'rgba(10,18,38,0.5)', borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 10, color: 'var(--muted)' }}>No image</span>
              </div>
            )}
          </div>

          {/* Fields */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                {item.suggestions?.player_name ?? item.suggestions?.set_name ?? 'Unknown card'}
              </h3>
              {item.suggestions && <ConfidenceBadge confidence={item.suggestions.confidence} />}
            </div>

            {item.suggestions?.raw_response && (
              <p style={{ margin: '0 0 14px', fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', lineHeight: 1.5 }}>
                &ldquo;{item.suggestions.raw_response}&rdquo;
              </p>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px 12px', marginBottom: 14 }}>
              {FIELD_DEFS.map(({ key, label }) => (
                <div key={key}>
                  <label style={{
                    display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--muted)',
                    textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3,
                  }}>
                    {label}
                  </label>
                  <input
                    type="text"
                    className="cv-input"
                    style={{ padding: '5px 9px', fontSize: 13 }}
                    value={fields[key]}
                    onChange={(e) => set(key, e.target.value)}
                  />
                </div>
              ))}

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{
                  display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--muted)',
                  textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3,
                }}>
                  Condition Notes
                </label>
                <textarea
                  className="cv-input"
                  style={{ padding: '5px 9px', fontSize: 13, resize: 'vertical', minHeight: 56 }}
                  value={fields.condition_notes}
                  onChange={(e) => set('condition_notes', e.target.value)}
                />
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                className="cv-btn cv-btn-primary"
                onClick={() => confirmMutation.mutate()}
                disabled={isBusy}
              >
                {confirmMutation.isPending ? 'Confirming\u2026' : 'Confirm'}
              </button>
              <button
                className="cv-btn cv-btn-danger"
                onClick={() => discardMutation.mutate()}
                disabled={isBusy}
              >
                {discardMutation.isPending ? 'Discarding\u2026' : 'Discard'}
              </button>
              {(confirmMutation.isError || discardMutation.isError) && (
                <span style={{ fontSize: 12, color: 'var(--danger)' }}>
                  Action failed &mdash; try again
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Comps panel */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>eBay Comps</span>
          <button
            className="cv-btn cv-btn-ghost"
            style={{ fontSize: 12, padding: '4px 12px' }}
            onClick={fetchComps}
            disabled={!canFetchComps}
          >
            {fetchingComps ? 'Fetching\u2026' : compsData ? 'Refresh' : 'Fetch prices'}
          </button>
          {!canFetchComps && !fetchingComps && (
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>Fill in player name or set to fetch comps</span>
          )}
        </div>

        {compsError && (
          <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--danger)' }}>{compsError}</p>
        )}

        {compsData && compsData.sold.length === 0 && compsData.active.length === 0 && (
          <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>
            No eBay listings found for this card.
          </p>
        )}

        {compsData && (compsData.sold.length > 0 || compsData.active.length > 0) && (
          <div style={{ display: 'grid', gridTemplateColumns: compsData.active.length > 0 ? '1fr 1fr' : '1fr', gap: 20 }}>
            {compsData.sold.length > 0 && (
              <div>
                <p style={{
                  margin: '0 0 8px', fontSize: 10, fontWeight: 700, color: 'var(--muted)',
                  textTransform: 'uppercase', letterSpacing: '0.5px',
                }}>
                  Sold ({compsData.sold.length})
                  {compsData.summary.average_price_cents != null &&
                    <> &middot; avg ${(compsData.summary.average_price_cents / 100).toFixed(2)}</>}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {compsData.sold.slice(0, 5).map((c, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{
                        color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap', maxWidth: '76%',
                      }}>
                        {c.title}
                      </span>
                      <span style={{ color: 'var(--good)', fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>
                        ${(c.sold_price_cents / 100).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {compsData.active.length > 0 && (
              <div>
                <p style={{
                  margin: '0 0 8px', fontSize: 10, fontWeight: 700, color: 'var(--muted)',
                  textTransform: 'uppercase', letterSpacing: '0.5px',
                }}>
                  Active ({compsData.active.length})
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {compsData.active.slice(0, 5).map((c, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{
                        color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap', maxWidth: '76%',
                      }}>
                        {c.title}
                      </span>
                      <span style={{ color: 'var(--warn)', fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>
                        ${(c.sold_price_cents / 100).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReviewQueuePage() {
  // Locally dismissed items (confirmed/discarded) fade out without refetching
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  const { data: rawItems = [], isPending, isFetching } = useQuery({
    queryKey: ['collection', 'pending'],
    queryFn: () => collection.list({ unconfirmed: true }),
  });

  const items = (rawItems as PendingCollectionItem[]).filter((i) => !dismissed.has(i.id));

  function handleDone(id: number) {
    setDismissed((prev) => new Set([...prev, id]));
  }

  if (isPending && isFetching) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
        <div className="cv-spinner" />
      </div>
    );
  }

  return (
    <>
      <div className="cv-page-header">
        <h1>Review Queue</h1>
        <p>
          {items.length > 0
            ? `${items.length} card${items.length !== 1 ? 's' : ''} pending review`
            : 'All caught up'}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="cv-empty">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden style={{ margin: '0 auto 14px', display: 'block' }}>
            <circle cx="24" cy="24" r="18" stroke="var(--good)" strokeWidth="2" fill="none" />
            <path d="M16 24l6 6 10-12" stroke="var(--good)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h3 style={{ margin: '0 0 4px', color: 'var(--muted)', fontWeight: 600 }}>Queue is empty</h3>
          <p>Cards pending AI review will appear here after you upload them.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 760 }}>
          {items.map((item) => (
            <ReviewCard key={item.id} item={item} onDone={handleDone} />
          ))}
        </div>
      )}
    </>
  );
}
