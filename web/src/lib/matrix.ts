/**
 * Matrix account creation wrapper.
 *
 * Requires Synapse to have registration enabled:
 *   enable_registration: true
 *   enable_registration_without_verification: true
 *
 * The registration flow used is m.login.dummy (no additional verification).
 * If Synapse requires a registration token or email, this flow will fail
 * and must be updated accordingly.
 */
import { MatrixError, createClient } from 'matrix-js-sdk'

export interface MatrixSession {
  userId: string
  accessToken: string
  deviceId: string
}

/** Derive a valid Matrix localpart from a display name */
export function usernameFromDisplayName(displayName: string): string {
  const base =
    displayName
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 24) || 'user'
  const suffix = Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return `${base}_${suffix}`
}

/** Generate a cryptographically random password (stored only in session) */
function randomPassword(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function createMatrixAccount(
  homeserver: string,
  displayName: string,
): Promise<MatrixSession> {
  const client = createClient({ baseUrl: homeserver })
  const username = usernameFromDisplayName(displayName)
  const password = randomPassword()

  const resp = await attemptRegister(client, username, password, null)

  if (resp === null) {
    // Should not happen - attemptRegister only returns null when caller should retry
    throw new Error('Registration failed: no response')
  }

  if (!resp.access_token || !resp.device_id) {
    throw new Error('Registration succeeded but no access token returned')
  }

  // Set display name (non-fatal if it fails)
  const authedClient = createClient({
    baseUrl: homeserver,
    accessToken: resp.access_token,
    userId: resp.user_id,
  })
  try {
    await authedClient.setDisplayName(displayName)
  } catch {
    // Display name can be set later; not blocking
  }

  return {
    userId: resp.user_id,
    accessToken: resp.access_token,
    deviceId: resp.device_id,
  }
}

async function attemptRegister(
  client: ReturnType<typeof createClient>,
  username: string,
  password: string,
  sessionId: string | null,
) {
  try {
    return await client.register(username, password, sessionId, { type: 'm.login.dummy' })
  } catch (err: unknown) {
    if (err instanceof MatrixError && err.httpStatus === 401 && err.data?.session) {
      // Server requires UIA — retry with the session token it gave us
      return await client.register(username, password, err.data.session as string, {
        type: 'm.login.dummy',
        session: err.data.session as string,
      })
    }
    if (err instanceof MatrixError) {
      throw new Error(err.data?.error ?? err.message ?? 'Matrix registration failed')
    }
    throw err
  }
}
