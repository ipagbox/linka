import { clearSession, type Session } from '../lib/session'

interface Props {
  session: Session
  onLogout: () => void
}

export function AppShell({ session, onLogout }: Props) {
  function handleLogout() {
    clearSession()
    onLogout()
  }

  return (
    <main>
      <h1>Linka</h1>
      <p>Signed in as {session.displayName || session.userId}</p>
      <button onClick={handleLogout}>Log out</button>
    </main>
  )
}
