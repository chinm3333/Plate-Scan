const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://127.0.0.1:8000'

export type User = {
  id: string
  email: string
  full_name: string
  role: string
  tenant_id: string
  tenant_name?: string | null
}

export type Case = {
  id: string
  vin: string
  plate?: string | null
  status: 'pending_claim' | 'active' | 'closed'
  tenant_id?: string | null
  originating_tenant_id: string
  assigned_agent_id?: string | null
  created_at: string
  claimed_at?: string | null
  originating_tenant_name?: string | null
  tenant_name?: string | null
  assigned_agent_name?: string | null
  is_claimable: boolean
}

export type Scan = {
  id: string
  camera_id: string
  plate: string
  vin: string
  latitude: number
  longitude: number
  scanned_at: string
  image_url?: string | null
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function login(email: string, password: string): Promise<string> {
  const body = new URLSearchParams()
  body.set('username', email)
  body.set('password', password)
  const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Login failed')
  }
  const data = await res.json()
  return data.access_token as string
}

export async function fetchMe(): Promise<User> {
  const res = await fetch(`${API_BASE}/api/v1/auth/me`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Not authenticated')
  return res.json()
}

export async function fetchCases(status?: string): Promise<Case[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : ''
  const res = await fetch(`${API_BASE}/api/v1/cases${qs}`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Failed to load cases')
  return res.json()
}

export async function fetchCase(id: string): Promise<Case> {
  const res = await fetch(`${API_BASE}/api/v1/cases/${id}`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Failed to load case')
  return res.json()
}

export async function fetchCaseScans(id: string): Promise<Scan[]> {
  const res = await fetch(`${API_BASE}/api/v1/cases/${id}/scans`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Failed to load scans')
  return res.json()
}

export async function claimCase(id: string): Promise<Case> {
  const res = await fetch(`${API_BASE}/api/v1/cases/${id}/claim`, {
    method: 'POST',
    headers: authHeaders(),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(typeof err.detail === 'string' ? err.detail : 'Claim failed')
  }
  return res.json()
}

export async function ingestScan(payload: Record<string, unknown>) {
  const res = await fetch(`${API_BASE}/api/v1/scans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(typeof err.detail === 'string' ? err.detail : 'Scan failed')
  }
  return res.json()
}
