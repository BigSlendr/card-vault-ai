import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import CardTile from '../components/CardTile'
import { useCollection } from '../lib/hooks'

const sortOptions = ['Value High→Low', 'Value Low→High', 'Year Newest', 'Date Added'] as const

export default function DashboardPage() {
  const { data = [], isLoading } = useCollection(true)
  const [search, setSearch] = useState('')
  const [sport, setSport] = useState('All Sports')
  const [sort, setSort] = useState<(typeof sortOptions)[number]>('Value High→Low')

  const sports = useMemo(() => {
    const values = new Set<string>()
    data.forEach((item) => values.add(item.card?.sport || item.card?.game || 'Other'))
    return ['All Sports', ...Array.from(values)]
  }, [data])

  const totals = useMemo(() => {
    const totalValue = data.reduce((sum, item) => sum + (item.estimated_value_cents || 0), 0)
    return { count: data.length, totalValue }
  }, [data])

  const filtered = useMemo(() => {
    return [...data]
      .filter((item) => (sport === 'All Sports' ? true : (item.card?.sport || item.card?.game || 'Other') === sport))
      .filter((item) => {
        const target = `${item.card?.player_name || ''} ${item.card?.card_name || ''}`.toLowerCase()
        return target.includes(search.toLowerCase())
      })
      .sort((a, b) => {
        if (sort === 'Value High→Low') return (b.estimated_value_cents || 0) - (a.estimated_value_cents || 0)
        if (sort === 'Value Low→High') return (a.estimated_value_cents || 0) - (b.estimated_value_cents || 0)
        if (sort === 'Year Newest') return (b.card?.year || 0) - (a.card?.year || 0)
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      })
  }, [data, search, sort, sport])

  if (isLoading) return <div className="glass p-6">Loading vault...</div>

  return (
    <div className="space-y-4">
      <section className="glass p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-xs text-cv-muted">Total cards</p>
            <p className="text-2xl font-bold">{totals.count}</p>
          </div>
          <div>
            <p className="text-xs text-cv-muted">Estimated value</p>
            <p className="text-2xl font-bold">${(totals.totalValue / 100).toFixed(2)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {sports.slice(1).map((s) => (
              <span key={s} className="badge">{s}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="glass p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search player or card" />
          <select className="input" value={sport} onChange={(e) => setSport(e.target.value)}>{sports.map((s) => <option key={s}>{s}</option>)}</select>
          <select className="input" value={sort} onChange={(e) => setSort(e.target.value as (typeof sortOptions)[number])}>{sortOptions.map((s) => <option key={s}>{s}</option>)}</select>
        </div>
      </section>

      {filtered.length === 0 ? (
        <section className="glass p-8 text-center">
          <p className="mb-2 text-lg font-semibold">No cards in your vault yet</p>
          <p className="mb-4 text-sm text-cv-muted">Upload your first card to get started.</p>
          <Link className="btn-primary" to="/upload">Upload card</Link>
        </section>
      ) : (
        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((item) => <CardTile key={item.id} collectionItem={item} />)}
        </section>
      )}
    </div>
  )
}
