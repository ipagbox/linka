import { clearSession } from './session'

interface Props {
  displayName: string
}

export default function AppShell({ displayName }: Props) {
  function handleLogout() {
    clearSession()
    window.location.href = '/'
  }

  return (
    <main>
      <h1>Linka</h1>
      <p data-testid="app-shell-greeting">Welcome, {displayName}</p>
      <p>Messaging coming soon.</p>
      <button onClick={handleLogout} data-testid="logout-button">
        Log out
      </button>
    </main>
  )
}
