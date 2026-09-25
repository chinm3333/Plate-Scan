import { useState, type FormEvent } from 'react'
import { ingestScan } from '../api'
import Shell from '../components/Shell'

const PRESETS = [
  {
    label: 'Existing-case flow (Tenant A / cam_1001)',
    payload: {
      camera_id: 'cam_1001',
      plate: '7XYZ123',
      vin: '1FTFW1E51NFA12345',
      latitude: 33.76,
      longitude: -84.39,
      scanned_at: new Date().toISOString(),
      image_url: 'https://example.com/scans/img_new_existing.jpg',
    },
  },
  {
    label: 'New-case flow (Tenant B / cam_2050)',
    payload: {
      camera_id: 'cam_2050',
      plate: 'ABC9988',
      vin: '5NPE34AF9KH123456',
      latitude: 33.78,
      longitude: -84.41,
      scanned_at: new Date().toISOString(),
      image_url: 'https://example.com/scans/img_new_pending.jpg',
    },
  },
]

export default function DemoToolsPage() {
  const [result, setResult] = useState<string>('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function postPreset(index: number) {
    setBusy(true)
    setError('')
    setResult('')
    try {
      const payload = {
        ...PRESETS[index].payload,
        scanned_at: new Date().toISOString(),
      }
      const data = await ingestScan(payload)
      setResult(JSON.stringify(data, null, 2))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  async function onCustom(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setBusy(true)
    setError('')
    setResult('')
    try {
      const data = await ingestScan({
        camera_id: String(fd.get('camera_id')),
        plate: String(fd.get('plate')),
        vin: String(fd.get('vin')),
        latitude: Number(fd.get('latitude')),
        longitude: Number(fd.get('longitude')),
        scanned_at: new Date().toISOString(),
        image_url: String(fd.get('image_url') || ''),
      })
      setResult(JSON.stringify(data, null, 2))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Shell>
      <header className="page-header">
        <div>
          <h1>Demo tools</h1>
          <p className="muted">Simulate camera webhooks (unauthenticated POST /api/v1/scans).</p>
        </div>
      </header>

      {error && <p className="error banner">{error}</p>}

      <section className="section">
        <h2>Presets</h2>
        <div className="actions">
          {PRESETS.map((p, i) => (
            <button key={p.label} type="button" disabled={busy} onClick={() => void postPreset(i)}>
              {p.label}
            </button>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>Custom scan</h2>
        <form className="grid-form" onSubmit={onCustom}>
          <label>
            camera_id
            <input name="camera_id" defaultValue="cam_2050" required />
          </label>
          <label>
            plate
            <input name="plate" defaultValue="ABC9988" required />
          </label>
          <label>
            vin
            <input name="vin" defaultValue="5NPE34AF9KH123456" required />
          </label>
          <label>
            latitude
            <input name="latitude" type="number" step="any" defaultValue="33.78" required />
          </label>
          <label>
            longitude
            <input name="longitude" type="number" step="any" defaultValue="-84.41" required />
          </label>
          <label>
            image_url
            <input name="image_url" defaultValue="https://example.com/scans/custom.jpg" />
          </label>
          <button type="submit" disabled={busy}>
            {busy ? 'Posting…' : 'Post scan'}
          </button>
        </form>
      </section>

      {result && (
        <section className="section">
          <h2>Response</h2>
          <pre className="code">{result}</pre>
        </section>
      )}
    </Shell>
  )
}
