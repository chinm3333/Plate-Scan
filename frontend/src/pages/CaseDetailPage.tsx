import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { claimCase, fetchCase, fetchCaseScans, type Case, type Scan } from '../api'
import Shell from '../components/Shell'

export default function CaseDetailPage() {
  const { id } = useParams()
  const [caseItem, setCaseItem] = useState<Case | null>(null)
  const [scans, setScans] = useState<Scan[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    if (!id) return
    setError('')
    try {
      const [c, s] = await Promise.all([fetchCase(id), fetchCaseScans(id)])
      setCaseItem(c)
      setScans(s)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    }
  }

  useEffect(() => {
    void load()
  }, [id])

  async function onClaim() {
    if (!id) return
    setBusy(true)
    setError('')
    try {
      await claimCase(id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Claim failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Shell>
      <p>
        <Link to="/">← Back to cases</Link>
      </p>
      {error && <p className="error banner">{error}</p>}
      {!caseItem ? (
        <p>Loading…</p>
      ) : (
        <>
          <header className="page-header">
            <div>
              <h1>{caseItem.vin}</h1>
              <p className="muted">
                Plate {caseItem.plate ?? '—'} ·{' '}
                <span className={`badge ${caseItem.status}`}>{caseItem.status}</span>
              </p>
            </div>
            {caseItem.is_claimable && (
              <button type="button" disabled={busy} onClick={() => void onClaim()}>
                {busy ? 'Claiming…' : 'Claim this case'}
              </button>
            )}
          </header>

          <dl className="meta">
            <div>
              <dt>Originating tenant</dt>
              <dd>{caseItem.originating_tenant_name ?? '—'}</dd>
            </div>
            <div>
              <dt>Assigned tenant</dt>
              <dd>{caseItem.tenant_name ?? 'Unassigned'}</dd>
            </div>
            <div>
              <dt>Assigned agent</dt>
              <dd>{caseItem.assigned_agent_name ?? '—'}</dd>
            </div>
            <div>
              <dt>Claimed at</dt>
              <dd>{caseItem.claimed_at ? new Date(caseItem.claimed_at).toLocaleString() : '—'}</dd>
            </div>
          </dl>

          <section className="section">
            <h2>Location trail</h2>
            <p className="muted">Every stored scan for this VIN, oldest first.</p>
            {scans.length === 0 ? (
              <p className="empty">No scans yet.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Camera</th>
                    <th>Plate</th>
                    <th>Lat</th>
                    <th>Lng</th>
                    <th>Image</th>
                  </tr>
                </thead>
                <tbody>
                  {scans.map((s) => (
                    <tr key={s.id}>
                      <td>{new Date(s.scanned_at).toLocaleString()}</td>
                      <td>{s.camera_id}</td>
                      <td>{s.plate}</td>
                      <td>{s.latitude.toFixed(4)}</td>
                      <td>{s.longitude.toFixed(4)}</td>
                      <td>
                        {s.image_url ? (
                          <a href={s.image_url} target="_blank" rel="noreferrer">
                            link
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </Shell>
  )
}
