import { beforeEach, describe, expect, it } from 'vitest'
import { clearSession, isValidSession, loadSession, saveSession, type Session } from './session'

const validSession: Session = {
  userId: '@alice:localhost',
  accessToken: 'syt_token_abc123',
  deviceId: 'ABCDEFGH',
  homeserver: 'http://localhost:8008',
  displayName: 'Alice',
}

beforeEach(() => {
  localStorage.clear()
})

describe('saveSession / loadSession', () => {
  it('persists and restores a valid session', () => {
    saveSession(validSession)
    expect(loadSession()).toEqual(validSession)
  })

  it('returns null when nothing is stored', () => {
    expect(loadSession()).toBeNull()
  })

  it('returns null and clears storage for malformed JSON', () => {
    localStorage.setItem('linka_session', '{not valid json')
    expect(loadSession()).toBeNull()
    expect(localStorage.getItem('linka_session')).toBeNull()
  })

  it('returns null and clears storage for an invalid session object', () => {
    localStorage.setItem('linka_session', JSON.stringify({ userId: '' }))
    expect(loadSession()).toBeNull()
    expect(localStorage.getItem('linka_session')).toBeNull()
  })
})

describe('clearSession', () => {
  it('removes the stored session', () => {
    saveSession(validSession)
    clearSession()
    expect(loadSession()).toBeNull()
  })
})

describe('isValidSession', () => {
  it('accepts a full valid session', () => {
    expect(isValidSession(validSession)).toBe(true)
  })

  it('rejects null', () => {
    expect(isValidSession(null)).toBe(false)
  })

  it('rejects a non-object', () => {
    expect(isValidSession('string')).toBe(false)
  })

  it('rejects session with empty userId', () => {
    expect(isValidSession({ ...validSession, userId: '' })).toBe(false)
  })

  it('rejects session with missing accessToken', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { accessToken, ...rest } = validSession
    expect(isValidSession(rest)).toBe(false)
  })

  it('rejects session with empty deviceId', () => {
    expect(isValidSession({ ...validSession, deviceId: '' })).toBe(false)
  })

  it('rejects session with empty homeserver', () => {
    expect(isValidSession({ ...validSession, homeserver: '' })).toBe(false)
  })

  it('allows empty displayName (display name is optional content)', () => {
    expect(isValidSession({ ...validSession, displayName: '' })).toBe(true)
  })
})
