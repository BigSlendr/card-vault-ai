import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { auth } from '../lib/api'
import { useSetUser } from '../hooks/useAuth'

function apiError(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const r = (err as { response?: { data?: { error?: string } } }).response
    if (r?.data?.error) return r.data.error
  }
  return 'Something went wrong — please try again.'
}

export default function RegisterPage() {
  const [email,    setEmail]    = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [formErr,  setFormErr]  = useState('')

  const navigate = useNavigate()
  const setUser  = useSetUser()

  const mutation = useMutation({
    mutationFn: () => auth.register(email, password, username || undefined),
    onSuccess: async (newUser) => {
      // register returns the user; log them in immediately
      try {
        const loggedIn = await auth.login(email, password)
        setUser(loggedIn)
      } catch {
        setUser(newUser)
      }
      navigate('/', { replace: true })
    },
    onError: (err) => setFormErr(apiError(err)),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormErr('')
    if (password.length < 8) {
      setFormErr('Password must be at least 8 characters.')
      return
    }
    mutation.mutate()
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
    }}>
      <div className="cv-surface" style={{ width: '100%', maxWidth: 380, padding: '36px 32px' }}>

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
              <rect x="1.5" y="4" width="21" height="16" rx="3"
                stroke="var(--primary)" strokeWidth="1.7" fill="none" />
              <rect x="1.5" y="8.5" width="21" height="4"
                fill="var(--primary)" fillOpacity="0.2" />
              <rect x="5" y="15" width="6" height="1.8" rx="0.9" fill="var(--muted)" />
            </svg>
            <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--text)', letterSpacing: '-0.4px' }}>
              CardVault <span style={{ color: 'var(--primary)' }}>AI</span>
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>Create your account</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>

          {/* Email */}
          <div style={{ marginBottom: 14 }}>
            <label htmlFor="reg-email" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--muted)', marginBottom: 6 }}>
              Email <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              id="reg-email"
              type="email"
              className="cv-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>

          {/* Username */}
          <div style={{ marginBottom: 14 }}>
            <label htmlFor="reg-username" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--muted)', marginBottom: 6 }}>
              Username <span style={{ fontSize: 11, color: 'var(--muted)', opacity: 0.7 }}>(optional)</span>
            </label>
            <input
              id="reg-username"
              type="text"
              className="cv-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. hobbyist99"
              autoComplete="username"
              maxLength={50}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 20 }}>
            <label htmlFor="reg-password" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--muted)', marginBottom: 6 }}>
              Password <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              id="reg-password"
              type="password"
              className="cv-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              autoComplete="new-password"
              required
            />
          </div>

          {/* Error */}
          {formErr && (
            <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--danger)' }}>{formErr}</p>
          )}

          <button type="submit" className="cv-btn cv-btn-primary" style={{ width: '100%' }} disabled={mutation.isPending}>
            {mutation.isPending ? 'Creating account…' : 'Create account'}
          </button>

        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--muted)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
            Sign in
          </Link>
        </p>

      </div>
    </div>
  )
}
