import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import App from './App'
import * as matrixModule from './matrix'

// Mock InvitePage and AppShell to avoid complex setup in App-level tests
vi.mock('./InvitePage', () => ({
  default: ({ token }: { token: string }) => <div data-testid="invite-page">InvitePage:{token}</div>,
}))
vi.mock('./AppShell', () => ({
  default: ({ displayName }: { displayName: string }) => (
    <div data-testid="app-shell">AppShell:{displayName}</div>
  ),
}))
vi.mock('./matrix', () => ({
  validateMatrixSession: vi.fn().mockResolvedValue(true),
  registerMatrixAccount: vi.fn(),
  generateUsername: vi.fn(),
  generatePassword: vi.fn(),
}))

const validSessionData = {
  version: 1,
  userId: '@alice:localhost',
  accessToken: 'syt_token',
  deviceId: 'DEVICE1',
  homeserver: 'http://localhost:8008',
  displayName: 'Alice',
}

beforeEach(() => {
  localStorage.clear()
  vi.mocked(matrixModule.validateMatrixSession).mockResolvedValue(true)
})

afterEach(() => {
  localStorage.clear()
})

describe('App — boot states', () => {
  it('shows loading state before boot completes', () => {
    // validateMatrixSession never resolves — boot stays in loading
    vi.mocked(matrixModule.validateMatrixSession).mockReturnValue(new Promise(() => {}))
    localStorage.setItem('linka_session', JSON.stringify(validSessionData))
    render(<App />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })
})

describe('App — routing', () => {
  it('renders the placeholder when no session and not on invite route', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText(/private messaging/i)).toBeInTheDocument()
    })
  })

  it('renders AppShell when a valid session is in localStorage', async () => {
    localStorage.setItem('linka_session', JSON.stringify(validSessionData))
    render(<App />)
    await waitFor(() => {
      expect(screen.getByTestId('app-shell')).toBeInTheDocument()
    })
    expect(screen.getByTestId('app-shell')).toHaveTextContent('Alice')
  })

  it('renders placeholder when session is malformed JSON', async () => {
    localStorage.setItem('linka_session', 'not-valid-json')
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText(/private messaging/i)).toBeInTheDocument()
    })
  })

  it('renders placeholder when session is missing version field', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { version, ...noVersion } = validSessionData
    localStorage.setItem('linka_session', JSON.stringify(noVersion))
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText(/private messaging/i)).toBeInTheDocument()
    })
  })

  it('clears session and renders placeholder when Matrix token is invalid (401)', async () => {
    vi.mocked(matrixModule.validateMatrixSession).mockResolvedValueOnce(false)
    localStorage.setItem('linka_session', JSON.stringify(validSessionData))
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText(/private messaging/i)).toBeInTheDocument()
    })
    expect(localStorage.getItem('linka_session')).toBeNull()
  })

  it('renders AppShell optimistically when Matrix validation fails with network error', async () => {
    vi.mocked(matrixModule.validateMatrixSession).mockRejectedValueOnce(new Error('Network error'))
    localStorage.setItem('linka_session', JSON.stringify(validSessionData))
    render(<App />)
    await waitFor(() => {
      expect(screen.getByTestId('app-shell')).toBeInTheDocument()
    })
  })
})
