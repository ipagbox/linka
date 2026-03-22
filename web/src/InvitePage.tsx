import { useState, useEffect } from 'react'
import { saveSession } from './session'
import { registerMatrixAccount, generateUsername, generatePassword } from './matrix'

const CONTROL_PLANE_URL = import.meta.env.VITE_CONTROL_PLANE_URL || 'http://localhost:8080'
const MATRIX_HOMESERVER = import.meta.env.VITE_MATRIX_HOMESERVER || 'http://localhost:8008'

type InviteState =
  | { status: 'loading' }
  | { status: 'valid' }
  | { status: 'invalid'; reason: string }
  | { status: 'submitting' }
  | { status: 'error'; message: string }

interface Props {
  token: string
}

export default function InvitePage({ token }: Props) {
  const [inviteState, setInviteState] = useState<InviteState>({ status: 'loading' })
  const [displayName, setDisplayName] = useState('')

  useEffect(() => {
    validateInvite(token)
  }, [token])

  async function validateInvite(tok: string) {
    setInviteState({ status: 'loading' })
    try {
      const res = await fetch(`${CONTROL_PLANE_URL}/api/v1/invites/${encodeURIComponent(tok)}`)
      const data: { usable?: boolean; reason?: string } = await res.json()
      if (data.usable) {
        setInviteState({ status: 'valid' })
      } else {
        const reason = data.reason === 'expired' ? 'This invite has expired.' : 'This invite is not valid.'
        setInviteState({ status: 'invalid', reason })
      }
    } catch {
      setInviteState({ status: 'invalid', reason: 'Could not reach the server. Please try again later.' })
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const name = displayName.trim()
    if (!name) return

    setInviteState({ status: 'submitting' })
    try {
      const username = generateUsername(name)
      const password = generatePassword()

      const { userId, accessToken, deviceId } = await registerMatrixAccount(
        MATRIX_HOMESERVER,
        username,
        password,
        name,
      )

      // Consume invite only after successful account creation
      const consumeRes = await fetch(
        `${CONTROL_PLANE_URL}/api/v1/invites/${encodeURIComponent(token)}/consume`,
        { method: 'POST' },
      )
      if (!consumeRes.ok) {
        // Account was created but invite consumption failed — log and continue.
        // Do not block the user; the account exists.
        console.warn('Invite consumption failed after successful registration')
      }

      saveSession({ userId, accessToken, deviceId, homeserver: MATRIX_HOMESERVER, displayName: name })
      window.location.href = '/'
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Account creation failed. Please try again.'
      setInviteState({ status: 'error', message })
    }
  }

  if (inviteState.status === 'loading') {
    return (
      <main>
        <h1>Linka</h1>
        <p>Checking invite…</p>
      </main>
    )
  }

  if (inviteState.status === 'invalid') {
    return (
      <main>
        <h1>Linka</h1>
        <p data-testid="invite-error">{inviteState.reason}</p>
      </main>
    )
  }

  return (
    <main>
      <h1>Linka</h1>
      <form onSubmit={handleSubmit} data-testid="onboarding-form">
        <label htmlFor="display-name">Your name</label>
        <input
          id="display-name"
          type="text"
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          placeholder="Enter your name"
          disabled={inviteState.status === 'submitting'}
          required
          autoFocus
        />
        <button type="submit" disabled={inviteState.status === 'submitting' || !displayName.trim()}>
          {inviteState.status === 'submitting' ? 'Setting up…' : 'Join Linka'}
        </button>
        {inviteState.status === 'error' && (
          <p data-testid="submit-error">{inviteState.message}</p>
        )}
      </form>
    </main>
  )
}
