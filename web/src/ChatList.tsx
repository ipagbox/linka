import type { DirectRoom } from './messaging'

interface Props {
  rooms: DirectRoom[]
  onSelect: (roomId: string) => void
}

export default function ChatList({ rooms, onSelect }: Props) {
  if (rooms.length === 0) {
    return (
      <section data-testid="chat-list">
        <p data-testid="chat-list-empty">No conversations yet.</p>
      </section>
    )
  }

  return (
    <section data-testid="chat-list">
      <ul>
        {rooms.map(room => (
          <li key={room.roomId}>
            <button
              data-testid="chat-list-item"
              onClick={() => onSelect(room.roomId)}
            >
              <span data-testid="chat-list-item-name">{room.peerName}</span>
              {room.lastMessage && (
                <span data-testid="chat-list-item-preview">{room.lastMessage}</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
