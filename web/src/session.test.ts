import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { saveSession, loadSession, clearSession, SESSION_VERSION, type Session } from './session'

// Fields passed to saveSession (version is added automatically)
const sessionInput: Omit<Session, 'version'> = {
  userId: '@alice:localhost',
  accessToken: 'syt_abc123',
  deviceId: 'DEVICEABC',
  homeserver: 'http://localhost:8008',
  displayName: 'Alice',
}

// The expected stored form (with version)
const savedSession: Session = {
  version: SESSION_VERSION,
  ...sessionInput,
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  localStorage.clear()
})

describe('saveSession / loadSession', () => {
  it('returns null when nothing is stored', () => {
    expect(loadSession()).toBeNull()
  })

  it('restores a valid session', () => {
    saveSession(sessionInput)
    expect(loadSession()).toEqual(savedSession)
  })

  it('includes the session version in stored data', () => {
    saveSession(sessionInput)
    const raw = localStorage.getItem('linka_session')
    const parsed = JSON.parse(raw!)
    expect(parsed.version).toBe(SESSION_VERSION)
  })

  it('returns null for malformed JSON', () => {
    localStorage.setItem('linka_session', 'not-json')
    expect(loadSession()).toBeNull()
  })

  it('returns null when required fields are missing', () => {
    localStorage.setItem('linka_session', JSON.stringify({ version: SESSION_VERSION, userId: '@alice:localhost' }))
    expect(loadSession()).toBeNull()
  })

  it('returns null when a field has wrong type', () => {
    const bad = { ...savedSession, accessToken: 42 }
    localStorage.setItem('linka_session', JSON.stringify(bad))
    expect(loadSession()).toBeNull()
  })

  it('returns null for null stored value', () => {
    localStorage.setItem('linka_session', 'null')
    expect(loadSession()).toBeNull()
  })

  it('returns null when version field is missing', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { version, ...noVersion } = savedSession
    localStorage.setItem('linka_session', JSON.stringify(noVersion))
    expect(loadSession()).toBeNull()
  })

  it('returns null when version is wrong', () => {
    const wrongVersion = { ...savedSession, version: 999 }
    localStorage.setItem('linka_session', JSON.stringify(wrongVersion))
    expect(loadSession()).toBeNull()
  })

  it('returns null when version is the right number but wrong type', () => {
    const wrongType = { ...savedSession, version: String(SESSION_VERSION) }
    localStorage.setItem('linka_session', JSON.stringify(wrongType))
    expect(loadSession()).toBeNull()
  })
})

describe('clearSession', () => {
  it('removes the stored session', () => {
    saveSession(sessionInput)
    clearSession()
    expect(loadSession()).toBeNull()
  })

  it('does not throw when no session exists', () => {
    expect(() => clearSession()).not.toThrow()
  })
})
