import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { saveSession, loadSession, clearSession, type Session } from './session'

const validSession: Session = {
  userId: '@alice:localhost',
  accessToken: 'syt_abc123',
  deviceId: 'DEVICEABC',
  homeserver: 'http://localhost:8008',
  displayName: 'Alice',
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
    saveSession(validSession)
    expect(loadSession()).toEqual(validSession)
  })

  it('returns null for malformed JSON', () => {
    localStorage.setItem('linka_session', 'not-json')
    expect(loadSession()).toBeNull()
  })

  it('returns null when required fields are missing', () => {
    localStorage.setItem('linka_session', JSON.stringify({ userId: '@alice:localhost' }))
    expect(loadSession()).toBeNull()
  })

  it('returns null when a field has wrong type', () => {
    const bad = { ...validSession, accessToken: 42 }
    localStorage.setItem('linka_session', JSON.stringify(bad))
    expect(loadSession()).toBeNull()
  })

  it('returns null for null stored value', () => {
    localStorage.setItem('linka_session', 'null')
    expect(loadSession()).toBeNull()
  })
})

describe('clearSession', () => {
  it('removes the stored session', () => {
    saveSession(validSession)
    clearSession()
    expect(loadSession()).toBeNull()
  })

  it('does not throw when no session exists', () => {
    expect(() => clearSession()).not.toThrow()
  })
})
