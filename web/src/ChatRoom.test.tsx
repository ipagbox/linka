import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { MatrixClient } from 'matrix-js-sdk'
import ChatRoom from './ChatRoom'

// ---------------------------------------------------------------------------
// Mock matrix-js-sdk RoomEvent import used in ChatRoom
// ---------------------------------------------------------------------------
vi.mock('matrix-js-sdk', () => ({
  RoomEvent: { Timeline: 'Room.timeline' },
}))

// ---------------------------------------------------------------------------
// Mock messaging module
// ---------------------------------------------------------------------------
vi.mock('./messaging', () => ({
  getRoomMessages: vi.fn().mockReturnValue([]),
  sendMatrixMessage: vi.fn().mockResolvedValue('$newmsg:localhost'),
  applyMessageStatusTransition: vi.fn((current: string, event: string) => {
    if (current === 'sending' && event === 'sent') return 'sent'
    if (current === 'sending' && event === 'failed') return 'failed'
    return current
  }),
}))

import * as messagingModule from './messaging'

const ROOM_ID = '!room1:localhost'
const MY_USER = '@alice:localhost'

function makeClient() {
  return {
    on: vi.fn(),
    off: vi.fn(),
    getRoom: vi.fn().mockReturnValue({ name: 'Bob', roomId: ROOM_ID }),
  } as unknown as MatrixClient
}

describe('ChatRoom', () => {
  beforeEach(() => {
    vi.mocked(messagingModule.getRoomMessages).mockReturnValue([])
    vi.mocked(messagingModule.sendMatrixMessage).mockResolvedValue('$newmsg:localhost')
  })

  it('renders room header', () => {
    render(
      <ChatRoom
        client={makeClient()}
        roomId={ROOM_ID}
        myUserId={MY_USER}
        onBack={vi.fn()}
      />,
    )
    expect(screen.getByTestId('room-header')).toBeInTheDocument()
  })

  it('shows no-messages placeholder when timeline is empty', () => {
    render(
      <ChatRoom
        client={makeClient()}
        roomId={ROOM_ID}
        myUserId={MY_USER}
        onBack={vi.fn()}
      />,
    )
    expect(screen.getByTestId('no-messages')).toBeInTheDocument()
  })

  it('calls onBack when back button clicked', () => {
    const onBack = vi.fn()
    render(
      <ChatRoom
        client={makeClient()}
        roomId={ROOM_ID}
        myUserId={MY_USER}
        onBack={onBack}
      />,
    )
    fireEvent.click(screen.getByTestId('back-button'))
    expect(onBack).toHaveBeenCalled()
  })

  it('send button is disabled when input is empty', () => {
    render(
      <ChatRoom
        client={makeClient()}
        roomId={ROOM_ID}
        myUserId={MY_USER}
        onBack={vi.fn()}
      />,
    )
    expect(screen.getByTestId('send-button')).toBeDisabled()
  })

  it('send button is enabled when input has text', () => {
    render(
      <ChatRoom
        client={makeClient()}
        roomId={ROOM_ID}
        myUserId={MY_USER}
        onBack={vi.fn()}
      />,
    )
    fireEvent.change(screen.getByTestId('message-input'), { target: { value: 'Hello' } })
    expect(screen.getByTestId('send-button')).not.toBeDisabled()
  })

  it('adding a message shows it optimistically with "sending" status', async () => {
    // Don't resolve immediately so we can see the 'sending' state
    vi.mocked(messagingModule.sendMatrixMessage).mockReturnValue(
      new Promise(() => {}), // never resolves
    )

    render(
      <ChatRoom
        client={makeClient()}
        roomId={ROOM_ID}
        myUserId={MY_USER}
        onBack={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByTestId('message-input'), { target: { value: 'Hello' } })
    fireEvent.submit(screen.getByTestId('message-form'))

    await waitFor(() => {
      expect(screen.getByTestId('message-body')).toHaveTextContent('Hello')
    })
    expect(screen.getByTestId('message-status')).toHaveTextContent('sending')
  })

  it('message transitions to "sent" after successful send', async () => {
    vi.mocked(messagingModule.sendMatrixMessage).mockResolvedValue('$newmsg:localhost')

    render(
      <ChatRoom
        client={makeClient()}
        roomId={ROOM_ID}
        myUserId={MY_USER}
        onBack={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByTestId('message-input'), { target: { value: 'Hello' } })
    fireEvent.submit(screen.getByTestId('message-form'))

    await waitFor(() => {
      expect(screen.getByTestId('message-status')).toHaveTextContent('sent')
    })
  })

  it('message transitions to "failed" after failed send', async () => {
    vi.mocked(messagingModule.sendMatrixMessage).mockRejectedValue(new Error('Network error'))

    render(
      <ChatRoom
        client={makeClient()}
        roomId={ROOM_ID}
        myUserId={MY_USER}
        onBack={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByTestId('message-input'), { target: { value: 'Hello' } })
    fireEvent.submit(screen.getByTestId('message-form'))

    await waitFor(() => {
      expect(screen.getByTestId('message-status')).toHaveTextContent('failed')
    })
  })

  it('shows retry button on failed message', async () => {
    vi.mocked(messagingModule.sendMatrixMessage).mockRejectedValue(new Error('Network error'))

    render(
      <ChatRoom
        client={makeClient()}
        roomId={ROOM_ID}
        myUserId={MY_USER}
        onBack={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByTestId('message-input'), { target: { value: 'Hello' } })
    fireEvent.submit(screen.getByTestId('message-form'))

    await waitFor(() => {
      expect(screen.getByTestId('retry-button')).toBeInTheDocument()
    })
  })

  it('incoming messages are displayed from getRoomMessages', () => {
    vi.mocked(messagingModule.getRoomMessages).mockReturnValue([
      {
        localId: '$incoming1',
        eventId: '$incoming1',
        sender: '@bob:localhost',
        body: 'Hey Alice!',
        timestamp: 1700000001000,
        status: 'sent',
      },
    ])

    render(
      <ChatRoom
        client={makeClient()}
        roomId={ROOM_ID}
        myUserId={MY_USER}
        onBack={vi.fn()}
      />,
    )

    expect(screen.getByTestId('message-body')).toHaveTextContent('Hey Alice!')
    // Incoming message has no status indicator
    expect(screen.queryByTestId('message-status')).not.toBeInTheDocument()
  })

  it('input is cleared after send', async () => {
    vi.mocked(messagingModule.sendMatrixMessage).mockResolvedValue('$newmsg:localhost')

    render(
      <ChatRoom
        client={makeClient()}
        roomId={ROOM_ID}
        myUserId={MY_USER}
        onBack={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByTestId('message-input'), { target: { value: 'Hello' } })
    fireEvent.submit(screen.getByTestId('message-form'))

    await waitFor(() => {
      expect(screen.getByTestId('message-input')).toHaveValue('')
    })
  })
})
