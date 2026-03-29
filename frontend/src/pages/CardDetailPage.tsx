import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  comps,
  grading,
  type CollectionItem,
  type GradingEstimateRecord,
} from '../lib/api';

// ── Utility helpers ───────────────────────────────────────────────────────────

function cents(n: number | null | undefined): string {
  if (n == null) return '\u2014';
  return '$' + (n / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function scoreColor(s: number): string {
  if (s >= 8) return 'var(--good)';
  if (s >= 6) return 'var(--warn)';
  return 'var(--danger)';
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MetaRow({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === '') return null;
  return (
    <div className="cv-surface" style={{ padding: '11px 14px', borderRadius: 10 }}>
      <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </p>
      <p style={{ margin: 0, fontSize: 14, color: 'var(--text)', fontWeight: 600 }}>{String(value)}</p>
    </div>
  );
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const pct = Math.min(100, Math.max(0, (score / 10) * 100));
  const color = scoreColor(score);
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>{score.toFixed(1)}</span>
      </div>
      <div style={{ height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 3 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  );
}

function PriceRangeBar({ low, avg, high }: { low: number; avg: number; high: number }) {
  const range = high - low;
  function pct(v: number) {
    return range === 0 ? 50 : Math.round(((v - low) / range) * 80 + 10);
  }
  const lowPct = pct(low);
  const avgPct = pct(avg);
  const highPct = pct(high);

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ position: 'relative', height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 3, margin: '8px 0 24px' }}>
        {/* Filled track between low and high */}
        <div style={{
          position: 'absolute', left: `${lowPct}%`, right: `${100 - highPct}%`,
          height: '100%', background: 'linear-gradient(90deg, var(--warn), var(--good))', borderRadius: 3,
        }} />
        {/* Markers */}
        {([
          { p: lowPct,  label: `Low\n${cents(low)}`,  color: 'var(--warn)' },
          { p: avgPct,  label: `Avg\n${cents(avg)}`,  color: 'var(--secondary)' },
          { p: highPct, label: `High\n${cents(high)}`, color: 'var(--good)' },
        ] as const).map(({ p, label, color }) => (
          <div key={label} style={{ position: 'absolute', left: `${p}%`, transform: 'translateX(-50%)' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, border: '2px solid var(--bg)', marginTop: -2 }} />
            <div style={{
              position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)',
              fontSize: 10, color: 'var(--muted)', whiteSpace: 'pre', textAlign: 'center', lineHeight: 1.4,
            }}>
              {label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Grading section ───────────────────────────────────────────────────────────

function GradingSection({ collectionItemId }: { collectionItemId: number }) {
  const queryClient = useQueryClient();

  const { data: grade, isError: noGrade, isLoading: gradeLoading } = useQuery({
    queryKey: ['grading', collectionItemId],
    queryFn: () => grading.getLatestGrade(collectionItemId),
  });

  const gradeMutation = useMutation({
    mutationFn: () => grading.estimateGrade(collectionItemId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['grading', collectionItemId] }),
  });

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>AI Grading</h2>
        <button
          className="cv-btn cv-btn-ghost"
          style={{ fontSize: 12, padding: '5px 12px' }}
          onClick={() => gradeMutation.mutate()}
          disabled={gradeMutation.isPending || gradeLoading}
        >
          {gradeMutation.isPending
            ? 'Analyzing\u2026'
            : grade
            ? 'Re-grade'
            : 'Get AI Grade Estimate'}
        </button>
        {gradeMutation.isError && (
          <span style={{ fontSize: 12, color: 'var(--danger)' }}>Grading failed \u2014 try again</span>
        )}
      </div>

      {gradeLoading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
          <div className="cv-spinner" style={{ width: 24, height: 24, borderWidth: 2 }} />
        </div>
      )}

      {!gradeLoading && (noGrade && !grade) && !gradeMutation.isPending && (
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
          No grade estimate yet. Click the button above to have AI analyze the card.
        </p>
      )}

      {grade && <GradeDisplay grade={grade} />}
    </section>
  );
}

function GradeDisplay({ grade }: { grade: GradingEstimateRecord }) {
  const confColor = grade.confidence >= 70 ? 'var(--good)' : grade.confidence >= 50 ? 'var(--warn)' : 'var(--danger)';
  return (
    <div className="cv-surface" style={{ padding: '18px 20px', borderRadius: 12 }}>
      {/* Grade range + confidence */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 18, flexWrap: 'wrap' }}>
        <span style={{
          fontSize: 20, fontWeight: 800, color: 'var(--text)',
          background: 'rgba(122,134,255,0.12)', padding: '4px 14px', borderRadius: 8,
          border: '1px solid rgba(122,134,255,0.3)',
        }}>
          {grade.estimated_grade_range}
        </span>
        <span style={{
          fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
          color: confColor, background: `${confColor}22`, border: `1px solid ${confColor}44`,
        }}>
          {grade.confidence}% confidence
        </span>
      </div>

      {/* Score bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
        <ScoreBar label="Centering" score={grade.centering.score} />
        <ScoreBar label="Corners"   score={grade.corners.score}   />
        <ScoreBar label="Edges"     score={grade.edges.score}     />
        <ScoreBar label="Surface"   score={grade.surface.score}   />
      </div>

      {/* Explanation */}
      {grade.explanation && (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
          {grade.explanation}
        </p>
      )}
    </div>
  );
}

// ── Comps section ─────────────────────────────────────────────────────────────

function CompsSection({ cardId }: { cardId: number }) {
  const queryClient = useQueryClient();

  const { data: compsData, isLoading: compsLoading, isError: compsError } = useQuery({
    queryKey: ['comps', cardId],
    queryFn: () => comps.getComps(cardId),
  });

  const refreshMutation = useMutation({
    mutationFn: () => comps.refreshComps(cardId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comps', cardId] }),
  });

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>eBay Comps</h2>
        <button
          className="cv-btn cv-btn-ghost"
          style={{ fontSize: 12, padding: '5px 12px' }}
          onClick={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending || compsLoading}
        >
          {refreshMutation.isPending ? 'Refreshing\u2026' : 'Refresh Comps'}
        </button>
        {compsData?.last_synced && (
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
            Last synced {timeAgo(compsData.last_synced)}
            {compsData.cached && ' (cached)'}
          </span>
        )}
        {refreshMutation.isError && (
          <span style={{ fontSize: 12, color: 'var(--danger)' }}>Refresh failed \u2014 try again</span>
        )}
      </div>

      {compsLoading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
          <div className="cv-spinner" style={{ width: 24, height: 24, borderWidth: 2 }} />
        </div>
      )}

      {compsError && !compsLoading && (
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
          No comps data yet. Click Refresh Comps to fetch current eBay prices.
        </p>
      )}

      {compsData && (
        <div className="cv-surface" style={{ padding: '18px 20px', borderRadius: 12 }}>
          {/* Price range bar */}
          {compsData.summary.low_price_cents != null &&
           compsData.summary.average_price_cents != null &&
           compsData.summary.high_price_cents != null && (
            <div style={{ marginBottom: 8 }}>
              <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Price Range ({compsData.summary.count} sold)
              </p>
              <PriceRangeBar
                low={compsData.summary.low_price_cents / 100}
                avg={compsData.summary.average_price_cents / 100}
                high={compsData.summary.high_price_cents / 100}
              />
            </div>
          )}

          {/* Sold comps */}
          {compsData.sold.length > 0 && (
            <div style={{ marginBottom: compsData.active.length > 0 ? 20 : 0 }}>
              <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Recent Sold ({compsData.sold.length})
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {compsData.sold.map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    <span style={{ color: 'var(--good)', fontWeight: 700, fontSize: 14, flexShrink: 0, minWidth: 60 }}>
                      {cents(c.sold_price_cents)}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--muted)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.title}
                    </span>
                    {c.listing_url && (
                      <a
                        href={c.listing_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: 11, color: 'var(--primary)', flexShrink: 0 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        eBay ↗
                      </a>
                    )}
                    <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>
                      {c.sold_date ? new Date(c.sold_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active listings summary */}
          {compsData.active.length > 0 && (
            <div style={{ borderTop: compsData.sold.length > 0 ? '1px solid var(--border)' : 'none', paddingTop: compsData.sold.length > 0 ? 16 : 0 }}>
              <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Active Listings ({compsData.active.length})
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {compsData.active.map((c, i) => (
                  <a
                    key={i}
                    href={c.listing_url ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: 12, color: 'var(--warn)', textDecoration: 'none',
                      padding: '3px 10px', borderRadius: 6,
                      background: 'rgba(255,207,124,0.08)', border: '1px solid rgba(255,207,124,0.2)',
                    }}
                  >
                    {cents(c.sold_price_cents)}
                  </a>
                ))}
              </div>
            </div>
          )}

          {compsData.sold.length === 0 && compsData.active.length === 0 && (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
              No eBay listings found for this card.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

// ── Edit form ─────────────────────────────────────────────────────────────────

interface EditFields {
  condition_note: string;
  estimated_grade: string;
  estimated_value_dollars: string;
  quantity: string;
}

function EditForm({
  item,
  onSave,
  onCancel,
}: {
  item: CollectionItem;
  onSave: (fields: EditFields) => void;
  onCancel: () => void;
}) {
  const [fields, setFields] = useState<EditFields>({
    condition_note:           item.condition_note           ?? '',
    estimated_grade:          item.estimated_grade          ?? '',
    estimated_value_dollars:  item.estimated_value_cents != null
                                ? (item.estimated_value_cents / 100).toFixed(2)
                                : '',
    quantity: String(item.quantity),
  });

  function set(k: keyof EditFields, v: string) {
    setFields((f) => ({ ...f, [k]: v }));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {([
        { key: 'quantity',               label: 'Quantity',        type: 'number' },
        { key: 'estimated_grade',        label: 'Estimated Grade', type: 'text'   },
        { key: 'estimated_value_dollars',label: 'Est. Value ($)',  type: 'number' },
        { key: 'condition_note',         label: 'Condition Notes', type: 'text'   },
      ] as const).map(({ key, label, type }) => (
        <div key={key}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
            {label}
          </label>
          <input
            type={type}
            className="cv-input"
            style={{ fontSize: 13, padding: '7px 11px' }}
            value={fields[key]}
            onChange={(e) => set(key, e.target.value)}
            min={type === 'number' ? 0 : undefined}
            step={key === 'estimated_value_dollars' ? '0.01' : undefined}
          />
        </div>
      ))}
      <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
        <button className="cv-btn cv-btn-primary" onClick={() => onSave(fields)}>Save</button>
        <button className="cv-btn cv-btn-ghost"  onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CardDetailPage() {
  const { id }       = useParams<{ id: string }>();
  const navigate     = useNavigate();
  const queryClient  = useQueryClient();
  const collectionId = Number(id);

  const [imgSide, setImgSide] = useState<'front' | 'back'>('front');
  const [editing, setEditing]         = useState(false);
  const [deletePhase, setDeletePhase] = useState<'idle' | 'confirm'>('idle');

  const { data: item, isLoading, isError } = useQuery({
    queryKey: ['collection', collectionId],
    queryFn:  () => collection.get(collectionId),
    enabled:  Number.isFinite(collectionId) && collectionId > 0,
  });

  const updateMutation = useMutation({
    mutationFn: (fields: EditFields) => {
      const valueCents = fields.estimated_value_dollars.trim()
        ? Math.round(parseFloat(fields.estimated_value_dollars) * 100)
        : undefined;
      return collection.update(collectionId, {
        condition_note:        fields.condition_note.trim() || undefined,
        estimated_grade:       fields.estimated_grade.trim() || undefined,
        estimated_value_cents: valueCents,
        quantity:              fields.quantity ? Number(fields.quantity) : undefined,
      });
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['collection', collectionId], updated);
      queryClient.invalidateQueries({ queryKey: ['collection'] });
      setEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => collection.delete(collectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection'] });
      navigate('/');
    },
  });

  // ── Loading / error states ────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <div className="cv-spinner" />
      </div>
    );
  }

  if (isError || !item) {
    return (
      <div className="cv-empty">
        <h3 style={{ margin: '0 0 4px', color: 'var(--muted)', fontWeight: 600 }}>Card not found</h3>
        <p>This item may have been removed.</p>
        <button className="cv-btn cv-btn-ghost" style={{ marginTop: 20 }} onClick={() => navigate('/')}>
          \u2190 Back to collection
        </button>
      </div>
    );
  }

  const hasBothSides = !!(item.front_image_url && item.back_image_url);
  const imgSrc = imgSide === 'back' && item.back_image_url
    ? item.back_image_url
    : item.front_image_url ?? null;

  const title = item.card_name ?? 'Unknown card';

  return (
    <>
      {/* Back nav */}
      <button
        className="cv-btn cv-btn-ghost"
        style={{ marginBottom: 24, padding: '6px 14px', fontSize: 13 }}
        onClick={() => navigate(-1)}
      >
        \u2190 Back
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 32, alignItems: 'start', maxWidth: 900 }}>

        {/* ── Left: image + actions ── */}
        <div>
          {/* Image */}
          <div className="cv-surface" style={{ padding: 10, borderRadius: 14, marginBottom: 12 }}>
            {imgSrc ? (
              <img
                src={imgSrc}
                alt={title}
                style={{ width: '100%', borderRadius: 8, display: 'block' }}
              />
            ) : (
              <div style={{ aspectRatio: '2/3', background: 'rgba(10,18,38,0.6)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>No image</span>
              </div>
            )}
          </div>

          {/* Front/back toggle */}
          {hasBothSides && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {(['front', 'back'] as const).map((s) => (
                <button
                  key={s}
                  className={`cv-btn ${imgSide === s ? 'cv-btn-primary' : 'cv-btn-ghost'}`}
                  style={{ flex: 1, fontSize: 12, padding: '6px 0', textTransform: 'capitalize' }}
                  onClick={() => setImgSide(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Action buttons */}
          {!editing && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button className="cv-btn cv-btn-ghost" style={{ width: '100%', fontSize: 13 }} onClick={() => setEditing(true)}>
                Edit metadata
              </button>

              {deletePhase === 'idle' ? (
                <button className="cv-btn cv-btn-danger" style={{ width: '100%', fontSize: 13 }} onClick={() => setDeletePhase('confirm')}>
                  Delete card
                </button>
              ) : (
                <div className="cv-surface" style={{ padding: '14px 12px', borderRadius: 10, border: '1px solid var(--danger)' }}>
                  <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--danger)', fontWeight: 600 }}>
                    Permanently delete this card?
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="cv-btn"
                      style={{ flex: 1, fontSize: 12, background: 'var(--danger)', color: '#fff', border: 'none', padding: '6px 0' }}
                      onClick={() => deleteMutation.mutate()}
                      disabled={deleteMutation.isPending}
                    >
                      {deleteMutation.isPending ? 'Deleting\u2026' : 'Delete'}
                    </button>
                    <button
                      className="cv-btn cv-btn-ghost"
                      style={{ flex: 1, fontSize: 12, padding: '6px 0' }}
                      onClick={() => setDeletePhase('idle')}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right: details ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

          {/* Header */}
          <div>
            <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.4px' }}>
              {title}
            </h1>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--muted)' }}>
              {[item.set_name, item.card_number ? `#${item.card_number}` : null].filter(Boolean).join(' \u00b7 ') || 'No set info'}
            </p>

            {/* Metadata grid */}
            {editing ? (
              <EditForm
                item={item}
                onSave={(fields) => updateMutation.mutate(fields)}
                onCancel={() => setEditing(false)}
              />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                <MetaRow label="Sport / Game"    value={item.game} />
                <MetaRow label="Variation"       value={item.rarity} />
                <MetaRow label="Quantity"        value={item.quantity > 1 ? item.quantity : null} />
                <MetaRow label="Estimated Grade" value={item.estimated_grade} />
                <MetaRow label="Condition"       value={item.condition_note} />
                <MetaRow label="Est. Value"      value={item.estimated_value_cents != null ? cents(item.estimated_value_cents) : null} />
              </div>
            )}

            {updateMutation.isError && (
              <p style={{ marginTop: 8, fontSize: 12, color: 'var(--danger)' }}>
                Save failed \u2014 please try again.
              </p>
            )}
          </div>

          {/* Grading */}
          <GradingSection collectionItemId={collectionId} />

          {/* Comps (only if card has been confirmed / has a card_id) */}
          {item.card_id != null ? (
            <CompsSection cardId={item.card_id} />
          ) : (
            <section>
              <h2 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>eBay Comps</h2>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
                Comps are available once the card has been confirmed in the Review Queue.
              </p>
            </section>
          )}

        </div>
      </div>
    </>
  );
}
