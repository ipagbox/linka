import { useState, useEffect } from 'react'
import { RoomEvent, ClientEvent } from 'matrix-js-sdk'
import type { MatrixEvent, Room } from 'matrix-js-sdk'
import { clearSession, type Session } from './session'
import {
  createMatrixClient,
  getDirectRooms,
  type MatrixClient,
  type DirectRoom,
} from './messaging'
import ChatList from './ChatList'
import ChatRoom from './ChatRoom'

interface Props {
  session: Session
}

export default function AppShell({ session }: Props) {
  const [client, setClient] = useState<MatrixClient | null>(null)
  const [rooms, setRooms] = useState<DirectRoom[]>([])
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)

  useEffect(() => {
    const mc = createMatrixClient(session)

    const handleSync = (state: string) => {
      if (state === 'PREPARED' || state === 'SYNCING') {
        setRooms(getDirectRooms(mc))
      }
    }

    const handleTimeline = (_event: MatrixEvent, room: Room | undefined) => {
      if (!room) return
      setRooms(getDirectRooms(mc))
    }

    mc.on(ClientEvent.Sync, handleSync)
    mc.on(RoomEvent.Timeline, handleTimeline)

    mc.startClient({ initialSyncLimit: 20 }).catch(() => {
      // Sync start failure is non-fatal; app remains usable with empty state
    })

    setClient(mc)

    return () => {
      mc.off(ClientEvent.Sync, handleSync)
      mc.off(RoomEvent.Timeline, handleTimeline)
      mc.stopClient()
      setClient(null)
    }
  }, [session])

  function handleLogout() {
    client?.stopClient()
    clearSession()
    window.location.href = '/'
  }

  return (
    <main>
      <header>
        <h1>Linka</h1>
        <p data-testid="app-shell-greeting">Welcome, {session.displayName}</p>
        <button onClick={handleLogout} data-testid="logout-button">
          Log out
        </button>
      </header>

      {client && selectedRoomId ? (
        <ChatRoom
          client={client}
          roomId={selectedRoomId}
          myUserId={session.userId}
          onBack={() => setSelectedRoomId(null)}
        />
      ) : (
        <ChatList rooms={rooms} onSelect={roomId => setSelectedRoomId(roomId)} />
      )}
    </main>
  )
}
