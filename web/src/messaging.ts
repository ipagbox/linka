import { createClient } from 'matrix-js-sdk'
import type { MatrixClient } from 'matrix-js-sdk'
import type { Session } from './session'

export interface DirectRoom {
  roomId: string
  peerUserId: string
  peerName: string
  lastMessage?: string
  lastTimestamp?: number
}

export interface Message {
  localId: string
  eventId?: string
  sender: string
  body: string
  timestamp: number
  status: 'sending' | 'sent' | 'failed'
}

export type MessageStatus = Message['status']

/** Pure reducer for message status transitions. */
export function applyMessageStatusTransition(
  current: MessageStatus,
  event: 'sent' | 'failed',
): MessageStatus {
  if (current === 'sending' && event === 'sent') return 'sent'
  if (current === 'sending' && event === 'failed') return 'failed'
  return current
}

/** Create a Matrix client from a stored session. */
export function createMatrixClient(session: Session): MatrixClient {
  return createClient({
    baseUrl: session.homeserver,
    userId: session.userId,
    accessToken: session.accessToken,
    deviceId: session.deviceId,
  })
}

/** Return all DM rooms the local user is joined to. */
export function getDirectRooms(client: MatrixClient): DirectRoom[] {
  const dmAccountData = client.getAccountData('m.direct' as Parameters<typeof client.getAccountData>[0])
  const dmMap = (dmAccountData?.getContent() ?? {}) as Record<string, string[]>

  const rooms: DirectRoom[] = []
  for (const [peerUserId, roomIds] of Object.entries(dmMap)) {
    if (!Array.isArray(roomIds)) continue
    for (const roomId of roomIds) {
      const room = client.getRoom(roomId)
      if (!room) continue
      if (room.getMyMembership() !== 'join') continue

      const events = room.getLiveTimeline().getEvents()
      const lastMsgEvent = [...events].reverse().find(e => e.getType() === 'm.room.message')

      rooms.push({
        roomId,
        peerUserId,
        peerName: room.getMember(peerUserId)?.name ?? peerUserId,
        lastMessage: lastMsgEvent?.getContent()?.body as string | undefined,
        lastTimestamp: lastMsgEvent?.getTs(),
      })
    }
  }

  return rooms.sort((a, b) => (b.lastTimestamp ?? 0) - (a.lastTimestamp ?? 0))
}

/** Return messages from a room's live timeline. */
export function getRoomMessages(client: MatrixClient, roomId: string): Message[] {
  const room = client.getRoom(roomId)
  if (!room) return []

  return room
    .getLiveTimeline()
    .getEvents()
    .filter(e => e.getType() === 'm.room.message')
    .map(e => ({
      localId: e.getId() ?? `evt-${e.getTs()}`,
      eventId: e.getId() ?? undefined,
      sender: e.getSender() ?? '',
      body: (e.getContent()?.body as string) ?? '',
      timestamp: e.getTs(),
      status: 'sent' as const,
    }))
}

/** Send a text message to a room and return the event ID. */
export async function sendMatrixMessage(
  client: MatrixClient,
  roomId: string,
  body: string,
): Promise<string> {
  const result = await client.sendTextMessage(roomId, body)
  return result.event_id
}

// Re-export MatrixClient type for consumers
export type { MatrixClient }
