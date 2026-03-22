import { useState, useEffect, useRef } from 'react'
import { RoomEvent } from 'matrix-js-sdk'
import type { MatrixEvent, Room } from 'matrix-js-sdk'
import { getRoomMessages, sendMatrixMessage, applyMessageStatusTransition } from './messaging'
import type { MatrixClient, Message } from './messaging'

interface Props {
  client: MatrixClient
  roomId: string
  myUserId: string
  onBack: () => void
}

export default function ChatRoom({ client, roomId, myUserId, onBack }: Props) {
  const [serverMessages, setServerMessages] = useState<Message[]>(() =>
    getRoomMessages(client, roomId),
  )
  const [localMessages, setLocalMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const timelineEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setServerMessages(getRoomMessages(client, roomId))
    setLocalMessages([])

    const handleTimeline = (event: MatrixEvent, room: Room | undefined) => {
      if (room?.roomId !== roomId) return
      if (event.getType() !== 'm.room.message') return
      setServerMessages(getRoomMessages(client, roomId))
    }

    client.on(RoomEvent.Timeline, handleTimeline)
    return () => {
      client.off(RoomEvent.Timeline, handleTimeline)
    }
  }, [client, roomId])

  useEffect(() => {
    timelineEndRef.current?.scrollIntoView?.({ behavior: 'smooth' })
  }, [serverMessages, localMessages])

  async function handleSend() {
    const body = input.trim()
    if (!body) return
    setInput('')

    const localId = crypto.randomUUID()
    const optimistic: Message = {
      localId,
      sender: myUserId,
      body,
      timestamp: Date.now(),
      status: 'sending',
    }
    setLocalMessages(prev => [...prev, optimistic])

    try {
      const eventId = await sendMatrixMessage(client, roomId, body)
      setLocalMessages(prev =>
        prev.map(m =>
          m.localId === localId
            ? { ...m, eventId, status: applyMessageStatusTransition(m.status, 'sent') }
            : m,
        ),
      )
    } catch {
      setLocalMessages(prev =>
        prev.map(m =>
          m.localId === localId
            ? { ...m, status: applyMessageStatusTransition(m.status, 'failed') }
            : m,
        ),
      )
    }
  }

  function handleRetry(localId: string, body: string) {
    setLocalMessages(prev => prev.filter(m => m.localId !== localId))

    const newLocalId = crypto.randomUUID()
    const optimistic: Message = {
      localId: newLocalId,
      sender: myUserId,
      body,
      timestamp: Date.now(),
      status: 'sending',
    }
    setLocalMessages(prev => [...prev, optimistic])

    sendMatrixMessage(client, roomId, body)
      .then(eventId => {
        setLocalMessages(prev =>
          prev.map(m =>
            m.localId === newLocalId ? { ...m, eventId, status: 'sent' } : m,
          ),
        )
      })
      .catch(() => {
        setLocalMessages(prev =>
          prev.map(m =>
            m.localId === newLocalId ? { ...m, status: 'failed' } : m,
          ),
        )
      })
  }

  // Deduplicate: remove local messages whose eventId is now in server messages
  const serverEventIds = new Set(serverMessages.map(m => m.eventId).filter(Boolean))
  const pendingLocal = localMessages.filter(
    m => !m.eventId || !serverEventIds.has(m.eventId),
  )
  const allMessages = [...serverMessages, ...pendingLocal].sort(
    (a, b) => a.timestamp - b.timestamp,
  )

  const room = client.getRoom(roomId)
  const roomName = room?.name ?? roomId

  return (
    <section data-testid="chat-room">
      <header>
        <button onClick={onBack} data-testid="back-button">
          ← Back
        </button>
        <h2 data-testid="room-header">{roomName}</h2>
      </header>

      <div data-testid="message-timeline">
        {allMessages.length === 0 && (
          <p data-testid="no-messages">No messages yet.</p>
        )}
        {allMessages.map(msg => (
          <div
            key={msg.localId}
            data-testid="message-item"
            data-own={msg.sender === myUserId ? 'true' : 'false'}
          >
            <span data-testid="message-body">{msg.body}</span>
            {msg.sender === myUserId && (
              <span data-testid="message-status">{msg.status}</span>
            )}
            {msg.status === 'failed' && (
              <button
                data-testid="retry-button"
                onClick={() => handleRetry(msg.localId, msg.body)}
              >
                Retry
              </button>
            )}
          </div>
        ))}
        <div ref={timelineEndRef} />
      </div>

      <form
        data-testid="message-form"
        onSubmit={e => {
          e.preventDefault()
          void handleSend()
        }}
      >
        <input
          data-testid="message-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type a message…"
        />
        <button type="submit" data-testid="send-button" disabled={!input.trim()}>
          Send
        </button>
      </form>
    </section>
  )
}
