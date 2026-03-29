import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import CardTile from '../components/CardTile';
import { collection, type CollectionItem } from '../lib/api';

// ── Helpers ───────────────────────────────────────────────────────────────────

function centsToDisplay(cents: number): string {
  return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function extractYear(setName: string | null | undefined): number | null {
  if (!setName) return null;
  const m = setName.match(/\b(19|20)\d{2}\b/);
  return m ? Number(m[0]) : null;
}

type SortKey = 'added' | 'value' | 'year';

function applySort(items: CollectionItem[], key: SortKey): CollectionItem[] {
  return [...items].sort((a, b) => {
    if (key === 'value') return (b.estimated_value_cents ?? -1) - (a.estimated_value_cents ?? -1);
    if (key === 'year') return (extractYear(b.set_name) ?? 0) - (extractYear(a.set_name) ?? 0);
    return b.id - a.id; // 'added': proxy via id desc
  });
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="cv-surface" style={{ padding: '10px 18px', borderRadius: 10, minWidth: 110 }}>
      <p style={{
        margin: '0 0 2px', fontSize: 10, fontWeight: 700, letterSpacing: '0.6px',
        textTransform: 'uppercase', color: 'var(--muted)',
      }}>
        {label}
      </p>
      <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: accent ? 'var(--secondary)' : 'var(--text)' }}>
        {value}
      </p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate();
  const [sport, setSport] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('added');
  const [search, setSearch] = useState('');

  const { data: allItems = [], isLoading, isError } = useQuery({
    queryKey: ['collection'],
    queryFn: () => collection.list(),
  });

  // Confirmed items only (card_id is set once the review queue item is confirmed)
  const confirmed = useMemo(() => allItems.filter((i) => i.card_id != null), [allItems]);

  // Stats
  const totalValueCents = confirmed.reduce((s, i) => s + (i.estimated_value_cents ?? 0), 0);
  const sportCounts = confirmed.reduce<Record<string, number>>((acc, i) => {
    const g = (i.game ?? 'Unknown').trim();
    acc[g] = (acc[g] ?? 0) + 1;
    return acc;
  }, {});
  const uniqueSports = Object.keys(sportCounts).sort();

  // Filter → sort
  const visible = useMemo(() => {
    let result = confirmed;
    if (sport) result = result.filter((i) => (i.game ?? 'Unknown').trim() === sport);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((i) => (i.card_name ?? '').toLowerCase().includes(q));
    }
    return applySort(result, sortKey);
  }, [confirmed, sport, sortKey, search]);

  const hasFilters = !!sport || !!search.trim();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <div className="cv-spinner" />
      </div>
    );
  }

  return (
    <>
      <div className="cv-page-header">
        <h1>My Collection</h1>
        <p>
          {isError ? 'Failed to load.' : `${confirmed.length} card${confirmed.length !== 1 ? 's' : ''}`}
          {allItems.length > confirmed.length && (
            <span style={{ color: 'var(--warn)', marginLeft: 8, fontSize: 12 }}>
              · {allItems.length - confirmed.length} pending review
            </span>
          )}
        </p>
      </div>

      {/* Stats bar */}
      {confirmed.length > 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
          <StatCard label="Total Cards" value={String(confirmed.length)} />
          {totalValueCents > 0 && (
            <StatCard label="Est. Value" value={centsToDisplay(totalValueCents)} accent />
          )}
          {uniqueSports.map((s) => (
            <StatCard key={s} label={s} value={String(sportCounts[s])} />
          ))}
        </div>
      )}

      {/* Filter / sort / search */}
      {confirmed.length > 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 22, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            className="cv-input"
            placeholder="Search player\u2026"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 190, padding: '7px 12px', fontSize: 13 }}
          />

          {uniqueSports.length > 1 && (
            <select
              className="cv-input"
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              style={{ width: 'auto', padding: '7px 12px', fontSize: 13 }}
            >
              <option value="">All sports</option>
              {uniqueSports.map((s) => (
                <option key={s} value={s}>{s} ({sportCounts[s]})</option>
              ))}
            </select>
          )}

          <select
            className="cv-input"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            style={{ width: 'auto', padding: '7px 12px', fontSize: 13 }}
          >
            <option value="added">Date Added</option>
            <option value="value">Est. Value \u2193</option>
            <option value="year">Year (newest)</option>
          </select>

          {hasFilters && (
            <button
              className="cv-btn cv-btn-ghost"
              style={{ fontSize: 12, padding: '6px 12px' }}
              onClick={() => { setSport(''); setSearch(''); }}
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Error */}
      {isError && (
        <p style={{ color: 'var(--danger)', fontSize: 14 }}>Failed to load collection — please refresh.</p>
      )}

      {/* Empty collection */}
      {!isError && confirmed.length === 0 && (
        <div className="cv-empty">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden style={{ margin: '0 auto 12px', display: 'block' }}>
            <rect x="4" y="8" width="40" height="32" rx="5" stroke="var(--border)" strokeWidth="2" fill="none" />
            <rect x="4" y="17" width="40" height="8" fill="var(--border)" fillOpacity="0.3" />
            <path d="M18 32h12" stroke="var(--border)" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <h3 style={{ margin: '0 0 4px', color: 'var(--muted)', fontWeight: 600 }}>No cards yet</h3>
          <p>Upload your first card to get started.</p>
          <button className="cv-btn cv-btn-primary" style={{ marginTop: 20 }} onClick={() => navigate('/upload')}>
            Upload a card
          </button>
        </div>
      )}

      {/* No filter results */}
      {!isError && confirmed.length > 0 && visible.length === 0 && (
        <div className="cv-empty" style={{ padding: '40px 24px' }}>
          <p style={{ color: 'var(--muted)', fontSize: 14, margin: 0 }}>No cards match your filters.</p>
          <button
            className="cv-btn cv-btn-ghost"
            style={{ marginTop: 14, fontSize: 13 }}
            onClick={() => { setSport(''); setSearch(''); }}
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Card grid */}
      {visible.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))',
          gap: 16,
        }}>
          {visible.map((item) => (
            <CardTile key={item.id} item={item} />
          ))}
        </div>
      )}
    </>
  );
}
