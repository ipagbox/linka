import { useCallback, useEffect, useState } from 'react'
import { AppShell } from './pages/AppShell'
import { InvitePage } from './pages/InvitePage'
import { loadSession, type Session } from './lib/session'

function useRoute() {
  const [path, setPath] = useState(window.location.pathname)
  useEffect(() => {
    function onPopState() {
      setPath(window.location.pathname)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])
  return path
}

function App() {
  const path = useRoute()
  const [session, setSession] = useState<Session | null>(() => loadSession())

  const handleSuccess = useCallback(() => {
    setSession(loadSession())
    window.history.pushState(null, '', '/')
  }, [])

  const handleLogout = useCallback(() => {
    setSession(null)
    window.history.pushState(null, '', '/')
  }, [])

  if (session) {
    return <AppShell session={session} onLogout={handleLogout} />
  }

  const inviteMatch = path.match(/^\/invite\/([^/]+)$/)
  if (inviteMatch) {
    return <InvitePage token={inviteMatch[1]} onSuccess={handleSuccess} />
  }

  return (
    <main>
      <h1>Linka</h1>
      <p>Private messaging. Coming soon.</p>
    </main>
  )
}

export default App
