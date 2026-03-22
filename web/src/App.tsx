import { loadSession } from './session'
import InvitePage from './InvitePage'
import AppShell from './AppShell'

function getInviteToken(): string | null {
  const match = window.location.pathname.match(/^\/invite\/([^/]+)$/)
  return match ? match[1] : null
}

function App() {
  const token = getInviteToken()
  if (token) {
    return <InvitePage token={token} />
  }

  const session = loadSession()
  if (session) {
    return <AppShell displayName={session.displayName} />
  }

  return (
    <main>
      <h1>Linka</h1>
      <p>Private messaging. Coming soon.</p>
    </main>
  )
}

export default App
