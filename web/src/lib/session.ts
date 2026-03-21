const SESSION_KEY = 'linka_session'

export interface Session {
  userId: string
  accessToken: string
  deviceId: string
  homeserver: string
  displayName: string
}

export function saveSession(session: Session): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function loadSession(): Session | null {
  const raw = localStorage.getItem(SESSION_KEY)
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isValidSession(parsed)) {
      clearSession()
      return null
    }
    return parsed
  } catch {
    clearSession()
    return null
  }
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
}

export function isValidSession(s: unknown): s is Session {
  if (typeof s !== 'object' || s === null) return false
  const obj = s as Record<string, unknown>
  return (
    typeof obj.userId === 'string' && obj.userId.length > 0 &&
    typeof obj.accessToken === 'string' && obj.accessToken.length > 0 &&
    typeof obj.deviceId === 'string' && obj.deviceId.length > 0 &&
    typeof obj.homeserver === 'string' && obj.homeserver.length > 0 &&
    typeof obj.displayName === 'string'
  )
}
