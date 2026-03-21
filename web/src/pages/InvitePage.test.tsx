import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../lib/api'
import * as matrix from '../lib/matrix'
import * as session from '../lib/session'
import { InvitePage } from './InvitePage'

vi.mock('../lib/api')
vi.mock('../lib/matrix')
vi.mock('../lib/session')

const mockValidateInvite = vi.mocked(api.validateInvite)
const mockConsumeInvite = vi.mocked(api.consumeInvite)
const mockCreateMatrixAccount = vi.mocked(matrix.createMatrixAccount)
const mockSaveSession = vi.mocked(session.saveSession)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('InvitePage', () => {
  it('shows loading state while validating', () => {
    mockValidateInvite.mockReturnValue(new Promise(() => {})) // never resolves
    render(<InvitePage token="abc123" onSuccess={() => {}} />)
    expect(screen.getByText(/checking invite/i)).toBeInTheDocument()
  })

  it('shows onboarding form for a valid invite', async () => {
    mockValidateInvite.mockResolvedValue({ usable: true, status: 'active' })
    render(<InvitePage token="abc123" onSuccess={() => {}} />)
    await waitFor(() => expect(screen.getByRole('textbox', { name: /your name/i })).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument()
  })

  it('shows error for an invalid invite', async () => {
    mockValidateInvite.mockResolvedValue({ usable: false, status: 'consumed', reason: 'consumed' })
    render(<InvitePage token="bad" onSuccess={() => {}} />)
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(screen.getByRole('alert')).toHaveTextContent(/consumed/)
  })

  it('shows error for expired invite', async () => {
    mockValidateInvite.mockResolvedValue({ usable: false, status: 'active', reason: 'expired' })
    render(<InvitePage token="expired" onSuccess={() => {}} />)
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(screen.getByRole('alert')).toHaveTextContent(/expired/)
  })

  it('shows error when server is unreachable', async () => {
    mockValidateInvite.mockRejectedValue(new Error('Network error'))
    render(<InvitePage token="tok" onSuccess={() => {}} />)
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
  })

  it('transitions to creating state on form submit', async () => {
    mockValidateInvite.mockResolvedValue({ usable: true, status: 'active' })
    mockCreateMatrixAccount.mockReturnValue(new Promise(() => {})) // stall
    render(<InvitePage token="abc" onSuccess={() => {}} />)
    await waitFor(() => screen.getByRole('textbox'))
    await userEvent.type(screen.getByRole('textbox'), 'Alice')
    await userEvent.click(screen.getByRole('button', { name: /continue/i }))
    expect(screen.getByText(/creating your account/i)).toBeInTheDocument()
  })

  it('calls onSuccess after successful account creation', async () => {
    const onSuccess = vi.fn()
    mockValidateInvite.mockResolvedValue({ usable: true, status: 'active' })
    mockCreateMatrixAccount.mockResolvedValue({
      userId: '@alice:localhost',
      accessToken: 'token',
      deviceId: 'DEV1',
    })
    mockConsumeInvite.mockResolvedValue(undefined)
    render(<InvitePage token="abc" onSuccess={onSuccess} />)
    await waitFor(() => screen.getByRole('textbox'))
    await userEvent.type(screen.getByRole('textbox'), 'Alice')
    await userEvent.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce())
    expect(mockSaveSession).toHaveBeenCalledOnce()
    expect(mockConsumeInvite).toHaveBeenCalledWith('abc')
  })

  it('shows error state when account creation fails', async () => {
    mockValidateInvite.mockResolvedValue({ usable: true, status: 'active' })
    mockCreateMatrixAccount.mockRejectedValue(new Error('Username taken'))
    render(<InvitePage token="abc" onSuccess={() => {}} />)
    await waitFor(() => screen.getByRole('textbox'))
    await userEvent.type(screen.getByRole('textbox'), 'Alice')
    await userEvent.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(screen.getByRole('alert')).toHaveTextContent(/username taken/i)
  })

  it('allows retry after error', async () => {
    mockValidateInvite.mockResolvedValue({ usable: true, status: 'active' })
    mockCreateMatrixAccount.mockRejectedValue(new Error('Oops'))
    render(<InvitePage token="abc" onSuccess={() => {}} />)
    await waitFor(() => screen.getByRole('textbox'))
    await userEvent.type(screen.getByRole('textbox'), 'Alice')
    await userEvent.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() => screen.getByRole('button', { name: /try again/i }))
    await userEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })
})
