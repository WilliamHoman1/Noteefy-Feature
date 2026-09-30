import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth'
import { Modal } from './Modal'

type AuthMode = 'signup' | 'login'

type AuthModalProps = {
  initialMode?: AuthMode
  reason?: string
  onClose: () => void
  onSuccess?: () => void
}

export function AuthModal({
  initialMode = 'signup',
  reason,
  onClose,
  onSuccess,
}: AuthModalProps) {
  const { signup, login } = useAuth()
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSaving(true)
    try {
      if (mode === 'signup') {
        await signup(name, email, password)
      } else {
        await login(email, password)
      }
      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={mode === 'signup' ? 'Create your account' : 'Welcome back'} onClose={onClose}>
      <div className="auth-tabs">
        <button
          type="button"
          className={mode === 'signup' ? 'auth-tab active' : 'auth-tab'}
          onClick={() => setMode('signup')}
        >
          Sign up
        </button>
        <button
          type="button"
          className={mode === 'login' ? 'auth-tab active' : 'auth-tab'}
          onClick={() => setMode('login')}
        >
          Sign in
        </button>
      </div>

      {reason && <p className="modal-note">{reason}</p>}

      <form className="modal-form" onSubmit={onSubmit}>
        {mode === 'signup' && (
          <label className="field">
            <span>Full name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              placeholder="Alex Rivers"
              required
            />
          </label>
        )}

        <label className="field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="alex@example.com"
            required
          />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            minLength={8}
            required
          />
          {mode === 'signup' && (
            <small className="field-hint">At least 8 characters.</small>
          )}
        </label>

        {error && <p className="modal-error">{error}</p>}

        <button type="submit" className="modal-submit" disabled={saving}>
          {saving ? 'Working…' : mode === 'signup' ? 'Create account' : 'Sign in'}
        </button>
      </form>
    </Modal>
  )
}
