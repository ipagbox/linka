import { useEffect, useReducer, useRef } from 'react'
import { validateInvite, consumeInvite } from '../lib/api'
import { createMatrixAccount } from '../lib/matrix'
import { saveSession } from '../lib/session'

const SYNAPSE_URL =
  (import.meta.env.VITE_SYNAPSE_URL as string | undefined) ?? 'http://localhost:8008'

type State =
  | { phase: 'validating' }
  | { phase: 'valid' }
  | { phase: 'invalid'; reason: string }
  | { phase: 'creating'; displayName: string }
  | { phase: 'error'; message: string }

type Action =
  | { type: 'VALID' }
  | { type: 'INVALID'; reason: string }
  | { type: 'SUBMIT'; displayName: string }
  | { type: 'ERROR'; message: string }

function reducer(_state: State, action: Action): State {
  switch (action.type) {
    case 'VALID':
      return { phase: 'valid' }
    case 'INVALID':
      return { phase: 'invalid', reason: action.reason }
    case 'SUBMIT':
      return { phase: 'creating', displayName: action.displayName }
    case 'ERROR':
      return { phase: 'error', message: action.message }
  }
}

interface Props {
  token: string
  onSuccess: () => void
}

export function InvitePage({ token, onSuccess }: Props) {
  const [state, dispatch] = useReducer(reducer, { phase: 'validating' })
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    validateInvite(token)
      .then((status) => {
        if (cancelled) return
        if (status.usable) {
          dispatch({ type: 'VALID' })
        } else {
          dispatch({ type: 'INVALID', reason: status.reason ?? status.status ?? 'invalid' })
        }
      })
      .catch(() => {
        if (!cancelled) dispatch({ type: 'INVALID', reason: 'Could not reach server' })
      })
    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    if (state.phase !== 'creating') return
    let cancelled = false

    createMatrixAccount(SYNAPSE_URL, state.displayName)
      .then((matrixSession) => {
        if (cancelled) return
        return consumeInvite(token).then(() => {
          saveSession({
            userId: matrixSession.userId,
            accessToken: matrixSession.accessToken,
            deviceId: matrixSession.deviceId,
            homeserver: SYNAPSE_URL,
            displayName: state.displayName,
          })
          if (!cancelled) onSuccess()
        })
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Account creation failed'
          dispatch({ type: 'ERROR', message })
        }
      })

    return () => {
      cancelled = true
    }
  }, [state, token, onSuccess])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const displayName = inputRef.current?.value.trim() ?? ''
    if (!displayName) return
    dispatch({ type: 'SUBMIT', displayName })
  }

  if (state.phase === 'validating') {
    return (
      <main>
        <h1>Linka</h1>
        <p>Checking invite…</p>
      </main>
    )
  }

  if (state.phase === 'invalid') {
    return (
      <main>
        <h1>Linka</h1>
        <p role="alert">This invite is not valid: {state.reason}</p>
      </main>
    )
  }

  if (state.phase === 'creating') {
    return (
      <main>
        <h1>Linka</h1>
        <p>Creating your account…</p>
      </main>
    )
  }

  if (state.phase === 'error') {
    return (
      <main>
        <h1>Linka</h1>
        <p role="alert">Something went wrong: {state.message}</p>
        <button onClick={() => dispatch({ type: 'VALID' })}>Try again</button>
      </main>
    )
  }

  // phase === 'valid'
  return (
    <main>
      <h1>Welcome to Linka</h1>
      <p>You have been invited. Enter your name to get started.</p>
      <form onSubmit={handleSubmit}>
        <label htmlFor="displayName">Your name</label>
        <input
          id="displayName"
          ref={inputRef}
          type="text"
          placeholder="Display name"
          autoFocus
          required
          minLength={1}
          maxLength={64}
        />
        <button type="submit">Continue</button>
      </form>
    </main>
  )
}
