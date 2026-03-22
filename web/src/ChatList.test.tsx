import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ChatList from './ChatList'
import type { DirectRoom } from './messaging'

const room1: DirectRoom = {
  roomId: '!room1:localhost',
  peerUserId: '@bob:localhost',
  peerName: 'Bob',
  lastMessage: 'Hello!',
  lastTimestamp: 1700000001000,
}

const room2: DirectRoom = {
  roomId: '!room2:localhost',
  peerUserId: '@carol:localhost',
  peerName: 'Carol',
}

describe('ChatList', () => {
  it('shows empty state when no rooms', () => {
    render(<ChatList rooms={[]} onSelect={vi.fn()} />)
    expect(screen.getByTestId('chat-list-empty')).toBeInTheDocument()
    expect(screen.getByTestId('chat-list-empty')).toHaveTextContent(/no conversations/i)
  })

  it('renders list of rooms', () => {
    render(<ChatList rooms={[room1, room2]} onSelect={vi.fn()} />)
    const items = screen.getAllByTestId('chat-list-item')
    expect(items).toHaveLength(2)
  })

  it('shows peer name', () => {
    render(<ChatList rooms={[room1]} onSelect={vi.fn()} />)
    expect(screen.getByTestId('chat-list-item-name')).toHaveTextContent('Bob')
  })

  it('shows last message preview when available', () => {
    render(<ChatList rooms={[room1]} onSelect={vi.fn()} />)
    expect(screen.getByTestId('chat-list-item-preview')).toHaveTextContent('Hello!')
  })

  it('does not show preview when lastMessage is absent', () => {
    render(<ChatList rooms={[room2]} onSelect={vi.fn()} />)
    expect(screen.queryByTestId('chat-list-item-preview')).not.toBeInTheDocument()
  })

  it('calls onSelect with roomId when item clicked', () => {
    const onSelect = vi.fn()
    render(<ChatList rooms={[room1, room2]} onSelect={onSelect} />)
    fireEvent.click(screen.getAllByTestId('chat-list-item')[0])
    expect(onSelect).toHaveBeenCalledWith('!room1:localhost')
  })
})
