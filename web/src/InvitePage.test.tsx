import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import InvitePage from './InvitePage'
import { loadSession } from './session'

// Mock matrix module — tests must not require a real Synapse
vi.mock('./matrix', () => ({
  registerMatrixAccount: vi.fn(),
  generateUsername: vi.fn(() => 'alice_abc12'),
  generatePassword: vi.fn(() => 'generatedpassword'),
}))

import * as matrixModule from './matrix'

const mockRegister = vi.mocked(matrixModule.registerMatrixAccount)

// Capture fetch calls
const originalFetch = globalThis.fetch

function mockFetch(handler: (url: string) => Response | Promise<Response>) {
  globalThis.fetch = vi.fn().mockImplementation(handler)
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

afterEach(() => {
  globalThis.fetch = originalFetch
  localStorage.clear()
})

describe('InvitePage — invite validation', () => {
  it('shows loading state while validating', () => {
    mockFetch(() => new Promise(() => {})) // never resolves
    render(<InvitePage token="abc123" />)
    expect(screen.getByText(/checking invite/i)).toBeInTheDocument()
  })

  it('shows onboarding form for a valid invite', async () => {
    mockFetch(() =>
      Response.json({ usable: true, status: 'active' }),
    )
    render(<InvitePage token="validtoken" />)
    await waitFor(() => expect(screen.getByTestId('onboarding-form')).toBeInTheDocument())
    expect(screen.getByLabelText(/your name/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /join linka/i })).toBeInTheDocument()
  })

  it('shows error for an invalid invite', async () => {
    mockFetch(() =>
      Response.json({ usable: false, reason: 'invalid' }),
    )
    render(<InvitePage token="badtoken" />)
    await waitFor(() => expect(screen.getByTestId('invite-error')).toBeInTheDocument())
    expect(screen.getByTestId('invite-error')).toHaveTextContent(/not valid/i)
  })

  it('shows expired message for an expired invite', async () => {
    mockFetch(() =>
      Response.json({ usable: false, reason: 'expired' }),
    )
    render(<InvitePage token="expiredtoken" />)
    await waitFor(() => expect(screen.getByTestId('invite-error')).toBeInTheDocument())
    expect(screen.getByTestId('invite-error')).toHaveTextContent(/expired/i)
  })

  it('shows error when network fails', async () => {
    mockFetch(() => Promise.reject(new Error('Network error')))
    render(<InvitePage token="anytoken" />)
    await waitFor(() => expect(screen.getByTestId('invite-error')).toBeInTheDocument())
  })
})

describe('InvitePage — onboarding form', () => {
  beforeEach(() => {
    // All tests here start with a valid invite
    mockFetch((url: string) => {
      if (url.includes('/consume')) {
        return Response.json({ consumed: true, used_count: 1 })
      }
      return Response.json({ usable: true, status: 'active' })
    })
  })

  it('submit button is disabled when display name is empty', async () => {
    render(<InvitePage token="validtoken" />)
    await waitFor(() => expect(screen.getByTestId('onboarding-form')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /join linka/i })).toBeDisabled()
  })

  it('submit button enables when display name is filled', async () => {
    render(<InvitePage token="validtoken" />)
    await waitFor(() => expect(screen.getByTestId('onboarding-form')).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: 'Alice' } })
    expect(screen.getByRole('button', { name: /join linka/i })).not.toBeDisabled()
  })

  it('shows loading state during submission', async () => {
    mockRegister.mockImplementation(() => new Promise(() => {})) // never resolves
    render(<InvitePage token="validtoken" />)
    await waitFor(() => expect(screen.getByTestId('onboarding-form')).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: 'Alice' } })
    fireEvent.submit(screen.getByTestId('onboarding-form'))
    await waitFor(() => expect(screen.getByRole('button', { name: /setting up/i })).toBeDisabled())
  })

  it('saves session and redirects on success', async () => {
    const originalLocation = window.location
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, href: '' },
      writable: true,
    })

    mockRegister.mockResolvedValue({
      userId: '@alice_abc12:localhost',
      accessToken: 'syt_token',
      deviceId: 'DEVICE1',
    })

    render(<InvitePage token="validtoken" />)
    await waitFor(() => expect(screen.getByTestId('onboarding-form')).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: 'Alice' } })
    fireEvent.submit(screen.getByTestId('onboarding-form'))

    await waitFor(() => {
      const session = loadSession()
      expect(session).not.toBeNull()
      expect(session?.displayName).toBe('Alice')
      expect(session?.userId).toBe('@alice_abc12:localhost')
    })

    Object.defineProperty(window, 'location', { value: originalLocation, writable: true })
  })

  it('shows error message when registration fails', async () => {
    mockRegister.mockRejectedValue(new Error('Registration failed'))
    render(<InvitePage token="validtoken" />)
    await waitFor(() => expect(screen.getByTestId('onboarding-form')).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: 'Alice' } })
    fireEvent.submit(screen.getByTestId('onboarding-form'))
    await waitFor(() => expect(screen.getByTestId('submit-error')).toBeInTheDocument())
    expect(screen.getByTestId('submit-error')).toHaveTextContent(/registration failed/i)
  })
})
