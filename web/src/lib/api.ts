const BASE_URL = (import.meta.env.VITE_CONTROL_PLANE_URL as string | undefined) ?? 'http://localhost:8080'

export interface InviteStatus {
  usable: boolean
  status: string
  reason?: string
  usage_type?: string
  used_count?: number
  max_uses?: number
  expires_at?: string | null
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function validateInvite(token: string): Promise<InviteStatus> {
  const res = await fetch(`${BASE_URL}/api/v1/invites/${encodeURIComponent(token)}`, {
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok && res.status !== 422) {
    throw new ApiError(`Invite lookup failed (${res.status})`, res.status)
  }
  return res.json() as Promise<InviteStatus>
}

export async function consumeInvite(token: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/v1/invites/${encodeURIComponent(token)}/consume`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    throw new ApiError(body.error ?? `Consume failed (${res.status})`, res.status)
  }
}
