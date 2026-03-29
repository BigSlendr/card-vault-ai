import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import UploadDropzone from '../components/UploadDropzone'
import { api } from '../lib/api'

type Stage = 'idle' | 'creating' | 'uploading' | 'analyzing' | 'comps' | 'error'

export default function UploadPage() {
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [side, setSide] = useState<'front' | 'back'>('front')
  const [stage, setStage] = useState<Stage>('idle')
  const [error, setError] = useState('')

  const label = useMemo(() => {
    if (stage === 'creating') return 'Creating collection entry...'
    if (stage === 'uploading') return 'Uploading image...'
    if (stage === 'analyzing') return 'Analyzing with AI...'
    if (stage === 'comps') return 'Fetching market data...'
    return ''
  }, [stage])

  async function startUpload() {
    if (!file) return
    setError('')
    try {
      setStage('creating')
      const created = await api.createCollectionItem({ quantity: 1 })
      setStage('uploading')
      await api.uploadDirect(created.id, side, file)
      setStage('analyzing')
      await api.identifyCard(created.id)
      setStage('comps')
      if (created.card_id) await api.refreshComps(created.card_id)
      navigate(`/review?id=${created.id}&added=1`)
    } catch (err) {
      setStage('error')
      setError((err as Error).message)
    }
  }

  return (
    <div className="space-y-4">
      <section className="glass p-5">
        <h2 className="mb-2 text-xl font-bold">Upload card</h2>
        <p className="mb-4 text-sm text-cv-muted">Step 1: Select image then continue to AI analysis.</p>
        <UploadDropzone
          loading={stage !== 'idle' && stage !== 'error'}
          onFile={(selectedFile, selectedSide) => {
            setFile(selectedFile)
            setSide(selectedSide)
          }}
        />
        <div className="mt-4 flex items-center gap-3">
          <button className="btn-primary" disabled={!file || stage === 'creating' || stage === 'uploading' || stage === 'analyzing' || stage === 'comps'} onClick={startUpload} type="button">
            Next
          </button>
          {label && <span className="text-sm text-cv-muted">{label}</span>}
        </div>
        {error && (
          <div className="mt-3 rounded-[var(--radius-md)] border border-cv-danger/50 bg-cv-danger/10 p-3 text-sm text-cv-danger">
            {error}
          </div>
        )}
      </section>
    </div>
  )
}
