import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ExternalLink } from 'lucide-react'
import PriceRangeBar from '../components/PriceRangeBar'
import { api } from '../lib/api'
import { queryKeys, useCollectionItem, useComps, useGrade } from '../lib/hooks'

export default function CardDetailPage() {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { data: item, isLoading } = useCollectionItem(id)
  const cardId = item?.card_id ?? undefined
  const { data: comps } = useComps(cardId)
  const { data: grade, refetch: refetchGrade } = useGrade(item?.id)
  const [showFront, setShowFront] = useState(true)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({
    quantity: item?.quantity || 1,
    condition_note: item?.condition_note || '',
    estimated_value_cents: item?.estimated_value_cents || 0,
  })

  const image = useMemo(() => (showFront ? item?.front_image_url : item?.back_image_url) || item?.front_image_url, [item, showFront])

  const gradingMutation = useMutation({
    mutationFn: async () => {
      if (!item) throw new Error('No item loaded')
      return api.estimateGrade(item.id)
    },
    onSuccess: () => void refetchGrade(),
  })

  const refreshComps = useMutation({
    mutationFn: async () => {
      if (!cardId) throw new Error('No card linked yet')
      return api.refreshComps(cardId)
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.comps(cardId) }),
  })

  async function saveEdit() {
    if (!item) return
    await api.updateCollectionItem(item.id, draft)
    await queryClient.invalidateQueries({ queryKey: queryKeys.collectionItem(id) })
    await queryClient.invalidateQueries({ queryKey: queryKeys.collection(true) })
    setEditing(false)
  }

  async function removeItem() {
    if (!item || !window.confirm('Delete this card permanently?')) return
    await api.deleteCollectionItem(item.id)
    navigate('/')
  }

  if (isLoading || !item) return <div className="glass p-6">Loading card details...</div>

  return (
    <div className="grid gap-4 lg:grid-cols-[340px,1fr]">
      <section className="glass p-4">
        <div className="mb-3 flex gap-2">
          <button className={showFront ? 'btn-primary text-sm' : 'btn-secondary text-sm'} onClick={() => setShowFront(true)} type="button">Front</button>
          <button className={!showFront ? 'btn-primary text-sm' : 'btn-secondary text-sm'} onClick={() => setShowFront(false)} type="button" disabled={!item.back_image_url}>Back</button>
        </div>
        {image ? <img className="w-full rounded-[var(--radius-md)]" src={image} alt={item.card?.card_name || 'Card'} /> : <div className="h-[420px] rounded-[var(--radius-md)] bg-[linear-gradient(135deg,var(--primary),var(--secondary))]" />}
      </section>

      <section className="space-y-4">
        <article className="glass p-4">
          <h1 className="text-2xl font-bold">{item.card?.player_name || item.card?.card_name || 'Unidentified Card'}</h1>
          <p className="text-sm text-cv-muted">{[item.card?.year, item.card?.set_name].filter(Boolean).join(' · ')}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="badge">#{item.card?.card_number || 'N/A'}</span>
            <span className="badge">{item.card?.sport || item.card?.game || 'Other'}</span>
            <span className="badge">{item.card?.variation || 'Base'}</span>
            <span className="badge">{item.card?.manufacturer || 'Unknown'}</span>
          </div>
          <p className="mt-3 text-sm text-cv-muted">{item.condition_note || 'No condition notes'}</p>
          <p className="mt-1 text-sm">Quantity: {item.quantity || 1}</p>
          <p className="mt-4 text-3xl font-bold">${((item.estimated_value_cents || 0) / 100).toFixed(2)}</p>

          {editing ? (
            <div className="mt-4 space-y-2">
              <input className="input" type="number" value={draft.quantity} onChange={(e) => setDraft((old) => ({ ...old, quantity: Number(e.target.value) }))} placeholder="Quantity" />
              <input className="input" value={draft.condition_note} onChange={(e) => setDraft((old) => ({ ...old, condition_note: e.target.value }))} placeholder="Condition note" />
              <input className="input" type="number" value={draft.estimated_value_cents} onChange={(e) => setDraft((old) => ({ ...old, estimated_value_cents: Number(e.target.value) }))} placeholder="Estimated value cents" />
              <div className="flex gap-2">
                <button className="btn-primary" onClick={() => void saveEdit()} type="button">Save</button>
                <button className="btn-ghost" onClick={() => setEditing(false)} type="button">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex gap-2">
              <button className="btn-secondary" onClick={() => setEditing(true)} type="button">Edit</button>
              <button className="btn-ghost border-cv-danger/60 text-cv-danger" onClick={() => void removeItem()} type="button">Delete</button>
            </div>
          )}
        </article>

        <article className="glass p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">AI Grading</h2>
            <button className="btn-primary" onClick={() => gradingMutation.mutate()} type="button">Get AI Grade Estimate</button>
          </div>
          {grade ? (
            <div className="space-y-2 text-sm">
              <span className="badge">{grade.estimated_grade_range}</span>
              {[
                ['Centering', grade.centering_score],
                ['Corners', grade.corners_score],
                ['Edges', grade.edges_score],
                ['Surface', grade.surface_score],
              ].map(([name, score]) => (
                <div key={name as string}>
                  <p className="mb-1 text-cv-muted">{name}</p>
                  <div className="h-2 rounded-full bg-cv-bg2">
                    <div className="h-2 rounded-full bg-cv-secondary" style={{ width: `${Number(score)}%` }} />
                  </div>
                </div>
              ))}
              <p>Confidence: {grade.confidence_score}%</p>
              <p className="text-cv-muted">{grade.explanation}</p>
            </div>
          ) : (
            <p className="text-sm text-cv-muted">No grading estimate yet.</p>
          )}
        </article>

        <article className="glass p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">eBay Comps</h2>
            <button className="btn-secondary" onClick={() => refreshComps.mutate()} type="button">Refresh Comps</button>
          </div>
          {comps ? (
            <div className="space-y-3">
              <PriceRangeBar low={comps.low} avg={comps.avg} high={comps.high} count={comps.count} lastSynced={comps.lastSynced} />
              <p className="text-xs text-cv-muted">Active listings: {comps.activeCount || 0} (${((comps.activeLow || 0) / 100).toFixed(2)}-${((comps.activeHigh || 0) / 100).toFixed(2)})</p>
              <div className="space-y-2">
                {(comps.sold || []).map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between rounded-[var(--radius-md)] border border-cv-border p-2 text-xs">
                    <div>
                      <p className="max-w-[360px] truncate font-medium">{sale.title}</p>
                      <p className="text-cv-muted">{sale.sold_date} · {sale.sold_platform || 'eBay'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>${(sale.sold_price_cents / 100).toFixed(2)}</span>
                      {sale.listing_url && <a href={sale.listing_url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4 text-cv-secondary" /></a>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-cv-muted">No comps yet. Try refresh.</p>
          )}
        </article>

        <Link className="btn-ghost" to="/review">Back to review queue</Link>
      </section>
    </div>
  )
}
