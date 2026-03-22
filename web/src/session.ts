export interface Session {
  userId: string
  accessToken: string
  deviceId: string
  homeserver: string
  displayName: string
}

const SESSION_KEY = 'linka_session'

export function saveSession(session: Session): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function loadSession(): Session | null {
  const raw = localStorage.getItem(SESSION_KEY)
  if (!raw) return null
  try {
    const data: unknown = JSON.parse(raw)
    if (
      data !== null &&
      typeof data === 'object' &&
      'userId' in data &&
      typeof (data as Record<string, unknown>).userId === 'string' &&
      'accessToken' in data &&
      typeof (data as Record<string, unknown>).accessToken === 'string' &&
      'deviceId' in data &&
      typeof (data as Record<string, unknown>).deviceId === 'string' &&
      'homeserver' in data &&
      typeof (data as Record<string, unknown>).homeserver === 'string' &&
      'displayName' in data &&
      typeof (data as Record<string, unknown>).displayName === 'string'
    ) {
      return data as Session
    }
    return null
  } catch {
    return null
  }
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
}
