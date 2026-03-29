import { useNavigate } from 'react-router-dom'
import type { CollectionItem } from '../lib/api'

// ── Helpers ───────────────────────────────────────────────────────────────────

function centsToDisplay(cents: number | null | undefined): string {
  if (cents == null) return '—'
  return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Pull a 4-digit year out of strings like "2023 Topps Chrome" or "Topps 2022". */
function extractYear(setName: string | null | undefined): string | null {
  if (!setName) return null
  const m = setName.match(/\b(19|20)\d{2}\b/)
  return m ? m[0] : null
}

function confidenceColor(score: number): string {
  if (score >= 80) return 'var(--good)'
  if (score >= 60) return 'var(--warn)'
  return 'var(--danger)'
}

function confidenceBg(score: number): string {
  if (score >= 80) return 'rgba(110,240,187,0.12)'
  if (score >= 60) return 'rgba(255,207,124,0.12)'
  return 'rgba(255,139,162,0.12)'
}

// ── Placeholder when no image is available ────────────────────────────────────

function ImagePlaceholder() {
  return (
    <div style={{
      width: '100%', aspectRatio: '2/3',
      background: 'rgba(10,18,38,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden>
        <rect x="4" y="7" width="32" height="26" rx="3"
          stroke="var(--border)" strokeWidth="1.5" fill="none" />
        <rect x="4" y="13" width="32" height="6"
          fill="var(--border)" fillOpacity="0.4" />
        <circle cx="14" cy="24" r="3" fill="var(--border)" />
        <rect x="20" y="22" width="10" height="2" rx="1" fill="var(--border)" />
        <rect x="20" y="26" width="7" height="2"  rx="1" fill="var(--border)" />
      </svg>
    </div>
  )
}

// ── Condition badge ───────────────────────────────────────────────────────────

function ConditionBadge({ grade, note }: { grade?: string | null; note?: string | null }) {
  const label = grade ?? (note ? note.slice(0, 16) : null)
  if (!label) return null
  return (
    <span className="cv-badge" style={{
      background: 'rgba(158,175,218,0.12)',
      color: 'var(--muted)',
      border: '1px solid rgba(158,175,218,0.2)',
    }}>
      {label}
    </span>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface CardTileProps {
  item: Pick<
    CollectionItem,
    'id' | 'front_image_url' | 'card_name' | 'set_name' | 'estimated_value_cents' | 'estimated_grade' | 'condition_note'
  >
  /** AI confidence score 0–100 from a grading estimate. Optional — badge hidden when absent. */
  confidence?: number | null
  onClick?: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CardTile({ item, confidence, onClick }: CardTileProps) {
  const navigate  = useNavigate()
  const year      = extractYear(item.set_name)
  const setLabel  = item.set_name
    ? (year ? item.set_name.replace(year, '').trim() : item.set_name)
    : null

  function handleClick() {
    if (onClick) { onClick(); return }
    navigate(`/card/${item.id}`)
  }

  return (
    <article className="cv-card-tile" onClick={handleClick} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick() }}
      aria-label={item.card_name ?? 'Card'}
    >

      {/* Image */}
      {item.front_image_url
        ? <img
            src={item.front_image_url}
            alt={item.card_name ?? 'Card image'}
            style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover', display: 'block' }}
          />
        : <ImagePlaceholder />
      }

      {/* Info panel */}
      <div style={{ padding: '12px 14px 14px' }}>

        {/* Player name + value */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
          <p style={{
            margin: 0, fontSize: 14, fontWeight: 700,
            color: 'var(--text)', lineHeight: 1.3,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
          }}>
            {item.card_name ?? 'Unknown card'}
          </p>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--secondary)', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {centsToDisplay(item.estimated_value_cents)}
          </span>
        </div>

        {/* Year + set */}
        <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--muted)', lineHeight: 1.3 }}>
          {[year, setLabel].filter(Boolean).join(' · ') || '—'}
        </p>

        {/* Badges */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          <ConditionBadge grade={item.estimated_grade} note={item.condition_note} />

          {confidence != null && (
            <span className="cv-badge" style={{
              background: confidenceBg(confidence),
              color:  confidenceColor(confidence),
              border: `1px solid ${confidenceColor(confidence)}44`,
            }}>
              AI {confidence}%
            </span>
          )}
        </div>

      </div>
    </article>
  )
}
