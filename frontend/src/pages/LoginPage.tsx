import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth'

export default function LoginPage() {
  const { user, login } = useAuth()
  const [email, setEmail] = useState('agent.a@agency-a.test')
  const [password, setPassword] = useState('password')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page center">
      <form className="panel login" onSubmit={onSubmit}>
        <p className="brand">Plate Scan</p>
        <h1>Staff login</h1>
        <p className="muted">Use a seeded tenant account to open the dashboard.</p>
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <div className="hint">
          <p>
            <strong>Tenant A:</strong> agent.a@agency-a.test / password
          </p>
          <p>
            <strong>Tenant B:</strong> agent.b@agency-b.test / password
          </p>
        </div>
      </form>
    </div>
  )
}
