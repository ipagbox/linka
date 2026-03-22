import { useState, useEffect } from 'react'
import { loadSession, clearSession, type Session } from './session'
import { validateMatrixSession } from './matrix'
import InvitePage from './InvitePage'
import AppShell from './AppShell'

type BootState =
  | { status: 'loading' }
  | { status: 'authenticated'; session: Session }
  | { status: 'unauthenticated' }

function getInviteToken(): string | null {
  const match = window.location.pathname.match(/^\/invite\/([^/]+)$/)
  return match ? match[1] : null
}

function App() {
  const inviteToken = getInviteToken()
  const [bootState, setBootState] = useState<BootState>({ status: 'loading' })

  useEffect(() => {
    if (inviteToken) return

    async function boot() {
      const session = loadSession()
      if (!session) {
        // No session or corrupted/invalid session — clear any stale data and redirect
        clearSession()
        setBootState({ status: 'unauthenticated' })
        return
      }

      try {
        const valid = await validateMatrixSession(session)
        if (valid) {
          setBootState({ status: 'authenticated', session })
        } else {
          // Token explicitly rejected (401) — clear session
          clearSession()
          setBootState({ status: 'unauthenticated' })
        }
      } catch {
        // Network or unexpected error: session structure is valid, proceed optimistically
        setBootState({ status: 'authenticated', session })
      }
    }

    void boot()
  }, [inviteToken])

  if (inviteToken) {
    return <InvitePage token={inviteToken} />
  }

  if (bootState.status === 'loading') {
    return (
      <main>
        <h1>Linka</h1>
        <p>Loading…</p>
      </main>
    )
  }

  if (bootState.status === 'authenticated') {
    return <AppShell session={bootState.session} />
  }

  return (
    <main>
      <h1>Linka</h1>
      <p>Private messaging. Coming soon.</p>
    </main>
  )
}

export default App
