import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, comps, uploads, vision } from '../lib/api';

const MAX_SIZE = 8 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
const STEPS = ['Uploading image\u2026', 'Analyzing card\u2026', 'Fetching comps\u2026'];

function validateFile(f: File): string | null {
  if (!ALLOWED.includes(f.type)) return 'Only JPG, PNG, and WebP images are accepted.';
  if (f.size > MAX_SIZE) return `File is ${(f.size / 1024 / 1024).toFixed(1)} MB \u2014 max is 8 MB.`;
  return null;
}

type UploadStatus =
  | { tag: 'idle' }
  | { tag: 'working'; step: number }
  | { tag: 'success' }
  | { tag: 'error'; message: string };

export default function UploadPage() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  // Preserved across retries so we don't create a second collection item
  const itemIdRef = useRef<number | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [side, setSide] = useState<'front' | 'back'>('front');
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [status, setStatus] = useState<UploadStatus>({ tag: 'idle' });

  const acceptFile = useCallback((f: File) => {
    const err = validateFile(f);
    if (err) { setFileError(err); return; }
    setFileError(null);
    setFile(f);
    setPreview((prev) => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(f); });
    setStatus({ tag: 'idle' });
    itemIdRef.current = null;
  }, []);

  // Document-level paste so the user doesn't need to focus the dropzone first
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.kind === 'file');
      if (item) { const f = item.getAsFile(); if (f) acceptFile(f); }
    }
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [acceptFile]);

  function clearFile() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setFileError(null);
    setStatus({ tag: 'idle' });
    itemIdRef.current = null;
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) acceptFile(f);
  }, [acceptFile]);

  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragOver(true); }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false);
  }, []);

  async function runUpload() {
    if (!file) return;
    setStatus({ tag: 'working', step: 0 });

    try {
      // Step 0: create collection item (preserved across retries)
      let id = itemIdRef.current;
      if (!id) {
        const item = await collection.create({});
        id = item.id;
        itemIdRef.current = id;
      }

      await uploads.uploadDirect(id, side, file);
      setStatus({ tag: 'working', step: 1 });

      // Step 1: AI identification
      const identified = await vision.identify(id);
      setStatus({ tag: 'working', step: 2 });

      // Step 2: pre-fetch comps using identified card name (best-effort, result discarded)
      const q = identified?.identification?.player_name ?? identified?.identification?.set_name;
      if (q) { try { await comps.search(q); } catch { /* ignore */ } }

      setStatus({ tag: 'success' });
    } catch (err) {
      setStatus({
        tag: 'error',
        message: err instanceof Error ? err.message : 'Upload failed \u2014 please try again.',
      });
    }
  }

  function handleAddAnother() {
    clearFile();
  }

  // ── Success ───────────────────────────────────────────────────────────────────
  if (status.tag === 'success') {
    return (
      <>
        <div className="cv-page-header">
          <h1>Upload Card</h1>
          <p>Card uploaded and analyzed.</p>
        </div>
        <div className="cv-surface" style={{ padding: 48, textAlign: 'center', maxWidth: 480 }}>
          <svg width="52" height="52" viewBox="0 0 52 52" fill="none" aria-hidden style={{ margin: '0 auto 16px', display: 'block' }}>
            <circle cx="26" cy="26" r="22" stroke="var(--good)" strokeWidth="2" fill="none" />
            <path d="M17 26l7 7 11-14" stroke="var(--good)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h3 style={{ margin: '0 0 8px', color: 'var(--text)', fontWeight: 600, fontSize: 17 }}>Card uploaded</h3>
          <p style={{ margin: '0 0 28px', fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
            AI has analyzed your card. Review and confirm the metadata before it joins your collection.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="cv-btn cv-btn-primary" onClick={() => navigate('/review')}>
              Go to Review Queue
            </button>
            <button className="cv-btn cv-btn-ghost" onClick={handleAddAnother}>
              Add Another Card
            </button>
          </div>
        </div>
      </>
    );
  }

  // ── Working ───────────────────────────────────────────────────────────────────
  if (status.tag === 'working') {
    return (
      <>
        <div className="cv-page-header">
          <h1>Upload Card</h1>
          <p>Processing your card&hellip;</p>
        </div>
        <div className="cv-surface" style={{ padding: 40, maxWidth: 420 }}>
          {preview && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
              <img
                src={preview}
                alt="Uploading"
                style={{ width: 90, height: 126, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }}
              />
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {STEPS.map((label, i) => {
              const done = i < status.step;
              const active = i === status.step;
              return (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: done ? 'var(--good)' : active ? 'var(--primary)' : 'transparent',
                    border: done || active ? 'none' : '1.5px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {done ? (
                      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                        <path d="M3 6.5l3 3 4-5.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : active ? (
                      <div className="cv-spinner" style={{ width: 13, height: 13, borderWidth: 2 }} />
                    ) : (
                      <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700 }}>{i + 1}</span>
                    )}
                  </div>
                  <span style={{
                    fontSize: 14,
                    color: done ? 'var(--good)' : active ? 'var(--text)' : 'var(--muted)',
                    fontWeight: active ? 600 : 400,
                  }}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </>
    );
  }

  // ── Idle / Preview ────────────────────────────────────────────────────────────
  return (
    <>
      <div className="cv-page-header">
        <h1>Upload Card</h1>
        <p>Add a new card to your collection.</p>
      </div>

      {file && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 18, alignItems: 'center' }}>
          {(['front', 'back'] as const).map((s) => (
            <button
              key={s}
              className={`cv-btn ${side === s ? 'cv-btn-primary' : 'cv-btn-ghost'}`}
              style={{ textTransform: 'capitalize', minWidth: 76 }}
              onClick={() => setSide(s)}
            >
              {s}
            </button>
          ))}
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>Which side is this?</span>
        </div>
      )}

      {/* Dropzone */}
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        style={{
          border: `2px dashed ${dragOver ? 'var(--primary)' : 'var(--border)'}`,
          borderRadius: 14,
          padding: file ? 20 : '52px 24px',
          textAlign: 'center',
          background: dragOver ? 'rgba(92,130,255,0.05)' : 'transparent',
          transition: 'border-color 0.15s, background 0.15s',
          maxWidth: 520,
          cursor: file ? 'default' : 'pointer',
        }}
        onClick={file ? undefined : () => inputRef.current?.click()}
        tabIndex={file ? undefined : 0}
        onKeyDown={(e) => !file && e.key === 'Enter' && inputRef.current?.click()}
        role={file ? undefined : 'button'}
        aria-label={file ? undefined : 'Click, drop, or paste an image to upload'}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) acceptFile(f); e.target.value = ''; }}
        />

        {file && preview ? (
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', textAlign: 'left' }}>
            <img
              src={preview}
              alt="Preview"
              style={{ width: 110, height: 154, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)', flexShrink: 0 }}
            />
            <div style={{ flex: 1, paddingTop: 4 }}>
              <p style={{ margin: '0 0 4px', fontSize: 14, color: 'var(--text)', fontWeight: 600, wordBreak: 'break-all' }}>
                {file.name}
              </p>
              <p style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--muted)' }}>
                {(file.size / 1024 / 1024).toFixed(1)} MB &middot; {file.type.replace('image/', '').toUpperCase()}
              </p>
              <button
                className="cv-btn cv-btn-ghost"
                style={{ fontSize: 12, padding: '4px 10px' }}
                onClick={(e) => { e.stopPropagation(); clearFile(); }}
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <>
            <svg width="40" height="40" viewBox="0 0 48 48" fill="none" aria-hidden style={{ margin: '0 auto 14px', display: 'block' }}>
              <rect x="4" y="8" width="40" height="32" rx="5"
                stroke={dragOver ? 'var(--primary)' : 'var(--border)'} strokeWidth="2" strokeDasharray="4 3" fill="none" />
              <path d="M24 20v9M19 25l5-5 5 5"
                stroke={dragOver ? 'var(--primary)' : 'var(--border)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p style={{ margin: '0 0 6px', fontSize: 14, color: 'var(--text)', fontWeight: 600 }}>
              Drop an image here, or{' '}
              <span style={{ color: 'var(--primary)' }}>click to browse</span>
            </p>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>
              Paste from clipboard also works &middot; JPG, PNG, WebP &middot; Max 8 MB
            </p>
          </>
        )}
      </div>

      {fileError && (
        <p style={{ marginTop: 10, fontSize: 13, color: 'var(--danger)' }}>{fileError}</p>
      )}

      {status.tag === 'error' && (
        <div className="cv-surface" style={{ marginTop: 14, padding: '12px 16px', maxWidth: 520, borderLeft: '3px solid var(--danger)' }}>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--danger)' }}>{status.message}</p>
        </div>
      )}

      {file && (
        <div style={{ marginTop: 20 }}>
          <button className="cv-btn cv-btn-primary" style={{ minWidth: 140 }} onClick={runUpload}>
            {status.tag === 'error' ? 'Retry Upload' : 'Upload Card'}
          </button>
        </div>
      )}
    </>
  );
}
