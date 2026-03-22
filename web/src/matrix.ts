import { createClient, MatrixError } from 'matrix-js-sdk'
import type { Session } from './session'

export interface MatrixRegistrationResult {
  userId: string
  accessToken: string
  deviceId: string
}

/**
 * Register a new Matrix account and set the display name.
 *
 * Uses the UIAA (User-Interactive Authentication API) flow:
 * 1. POST /register — server responds 401 with session + flows
 * 2. POST /register with auth.type = 'm.login.dummy' and session — completes registration
 * 3. Set display name via profile API
 *
 * Requires a Synapse homeserver with open registration (no email verification).
 * In production this should be locked down at the Synapse level; invite enforcement
 * is done via the control-plane.
 *
 * Limitation: this flow requires a running Synapse at the configured homeserver URL.
 * Tests mock this module entirely; no real Synapse is needed for test execution.
 */
export async function registerMatrixAccount(
  homeserver: string,
  username: string,
  password: string,
  displayName: string,
): Promise<MatrixRegistrationResult> {
  const client = createClient({ baseUrl: homeserver })

  // First attempt — triggers 401 UIAA with session ID
  let uiaSession: string | undefined
  try {
    const result = await client.register(username, password, null, { type: 'm.login.dummy' })
    // Direct success (homeserver with no UIAA required)
    const userId = result.user_id
    const accessToken = result.access_token!
    const deviceId = result.device_id!
    const authed = createClient({ baseUrl: homeserver, userId, accessToken })
    await authed.setDisplayName(displayName)
    return { userId, accessToken, deviceId }
  } catch (e: unknown) {
    if (e instanceof MatrixError && e.httpStatus === 401 && e.data?.session) {
      uiaSession = e.data.session as string
    } else {
      throw e
    }
  }

  // Second attempt — complete UIAA with dummy auth
  const result = await client.register(username, password, uiaSession, {
    type: 'm.login.dummy',
  })

  const userId = result.user_id
  const accessToken = result.access_token!
  const deviceId = result.device_id!

  const authed = createClient({ baseUrl: homeserver, userId, accessToken })
  await authed.setDisplayName(displayName)

  return { userId, accessToken, deviceId }
}

/** Generate a Matrix-safe username from a display name + random suffix. */
export function generateUsername(displayName: string): string {
  const base = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 16)
  const suffix = Math.random().toString(36).slice(2, 7)
  return (base || 'user') + '_' + suffix
}

/**
 * Validate a stored session by checking whether the access token is still accepted
 * by the homeserver.
 *
 * Returns true if the token is valid.
 * Returns false if the homeserver responds 401 (token invalid or expired).
 * Throws for any other error (network failure, unexpected response) so the caller
 * can decide how to handle it (e.g. proceed optimistically).
 */
export async function validateMatrixSession(session: Session): Promise<boolean> {
  const client = createClient({
    baseUrl: session.homeserver,
    userId: session.userId,
    accessToken: session.accessToken,
    deviceId: session.deviceId,
  })
  try {
    await client.whoami()
    return true
  } catch (e) {
    if (e instanceof MatrixError && e.httpStatus === 401) {
      return false
    }
    throw e
  }
}

/** Generate a random password (access token is used for session; password not stored). */
export function generatePassword(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}
