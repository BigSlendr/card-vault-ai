type Props = {
  low: number
  avg: number
  high: number
  count: number
  lastSynced?: string
}

const usd = (cents: number) => `$${(cents / 100).toFixed(2)}`

function relativeMinutes(iso?: string) {
  if (!iso) return 'just now'
  const delta = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  return `${delta} minute${delta === 1 ? '' : 's'} ago`
}

export default function PriceRangeBar({ low, avg, high, count, lastSynced }: Props) {
  const width = high > 0 ? Math.max(8, (avg / high) * 100) : 0

  return (
    <div className="glass p-4">
      <div className="mb-3 flex items-end justify-between text-sm">
        <div>
          <p className="text-cv-muted">Market range</p>
          <p className="font-semibold">
            {usd(low)} - {usd(high)}
          </p>
        </div>
        <p className="text-xs text-cv-muted">Avg {usd(avg)}</p>
      </div>
      <div className="relative h-3 rounded-full bg-cv-bg2">
        <div className="absolute left-0 top-0 h-3 rounded-full bg-cv-secondary" style={{ width: `${width}%` }} />
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-cv-muted">
        <span>{count} recent sales</span>
        <span>Updated {relativeMinutes(lastSynced)}</span>
      </div>
    </div>
  )
}
