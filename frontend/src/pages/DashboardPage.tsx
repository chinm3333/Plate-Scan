import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { claimCase, fetchCases, type Case } from '../api'
import { useAuth } from '../auth'
import Shell from '../components/Shell'

export default function DashboardPage() {
  const { user } = useAuth()
  const [cases, setCases] = useState<Case[]>([])
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [filter, setFilter] = useState('')

  async function load() {
    setError('')
    try {
      const data = await fetchCases(filter || undefined)
      setCases(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    }
  }

  useEffect(() => {
    void load()
  }, [filter])

  const mine = cases.filter((c) => c.tenant_id === user?.tenant_id)
  const claimable = cases.filter((c) => c.status === 'pending_claim')

  async function onClaim(id: string) {
    setBusyId(id)
    setError('')
    try {
      await claimCase(id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Claim failed')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Shell>
      <header className="page-header">
        <div>
          <h1>Cases</h1>
          <p className="muted">
            {user?.tenant_name} · {user?.full_name}
          </p>
        </div>
        <label className="filter">
          Status
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">All visible</option>
            <option value="pending_claim">pending_claim</option>
            <option value="active">active</option>
            <option value="closed">closed</option>
          </select>
        </label>
      </header>

      {error && <p className="error banner">{error}</p>}

      <section className="section">
        <h2>My tenant cases</h2>
        <p className="muted">Active and closed cases belonging to your agency.</p>
        <CaseTable cases={mine.filter((c) => c.status !== 'pending_claim')} empty="No claimed cases yet." />
      </section>

      <section className="section">
        <h2>Claimable pending cases</h2>
        <p className="muted">
          Includes pending cases originated by other tenants — any agency can claim.
        </p>
        {claimable.length === 0 ? (
          <p className="empty">No pending cases. Use Demo tools to post a new-case scan.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>VIN</th>
                <th>Plate</th>
                <th>Originated by</th>
                <th>Created</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {claimable.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link to={`/cases/${c.id}`}>{c.vin}</Link>
                  </td>
                  <td>{c.plate ?? '—'}</td>
                  <td>{c.originating_tenant_name ?? '—'}</td>
                  <td>{new Date(c.created_at).toLocaleString()}</td>
                  <td>
                    <button
                      type="button"
                      disabled={busyId === c.id}
                      onClick={() => void onClaim(c.id)}
                    >
                      {busyId === c.id ? 'Claiming…' : 'Claim'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </Shell>
  )
}

function CaseTable({ cases, empty }: { cases: Case[]; empty: string }) {
  if (cases.length === 0) return <p className="empty">{empty}</p>
  return (
    <table>
      <thead>
        <tr>
          <th>VIN</th>
          <th>Plate</th>
          <th>Status</th>
          <th>Agent</th>
          <th>Created</th>
        </tr>
      </thead>
      <tbody>
        {cases.map((c) => (
          <tr key={c.id}>
            <td>
              <Link to={`/cases/${c.id}`}>{c.vin}</Link>
            </td>
            <td>{c.plate ?? '—'}</td>
            <td>
              <span className={`badge ${c.status}`}>{c.status}</span>
            </td>
            <td>{c.assigned_agent_name ?? '—'}</td>
            <td>{new Date(c.created_at).toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
