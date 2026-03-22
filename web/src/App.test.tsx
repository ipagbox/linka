import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import App from './App'

// Mock InvitePage and AppShell to avoid complex setup in App-level tests
vi.mock('./InvitePage', () => ({
  default: ({ token }: { token: string }) => <div data-testid="invite-page">InvitePage:{token}</div>,
}))
vi.mock('./AppShell', () => ({
  default: ({ displayName }: { displayName: string }) => (
    <div data-testid="app-shell">AppShell:{displayName}</div>
  ),
}))

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  localStorage.clear()
})

describe('App — routing', () => {
  it('renders the placeholder when no session and not on invite route', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /linka/i })).toBeInTheDocument()
    expect(screen.getByText(/private messaging/i)).toBeInTheDocument()
  })

  it('renders AppShell when a valid session is in localStorage', () => {
    localStorage.setItem(
      'linka_session',
      JSON.stringify({
        userId: '@alice:localhost',
        accessToken: 'syt_token',
        deviceId: 'DEVICE1',
        homeserver: 'http://localhost:8008',
        displayName: 'Alice',
      }),
    )
    render(<App />)
    expect(screen.getByTestId('app-shell')).toBeInTheDocument()
    expect(screen.getByTestId('app-shell')).toHaveTextContent('Alice')
  })

  it('renders placeholder when session is malformed', () => {
    localStorage.setItem('linka_session', 'not-valid-json')
    render(<App />)
    expect(screen.getByText(/private messaging/i)).toBeInTheDocument()
  })
})
