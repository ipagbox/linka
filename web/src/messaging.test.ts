import { describe, it, expect, vi } from 'vitest'
import {
  applyMessageStatusTransition,
  getDirectRooms,
  getRoomMessages,
  sendMatrixMessage,
} from './messaging'
import type { MatrixClient } from 'matrix-js-sdk'

// ---------------------------------------------------------------------------
// applyMessageStatusTransition — pure reducer tests
// ---------------------------------------------------------------------------

describe('applyMessageStatusTransition', () => {
  it('sending + sent → sent', () => {
    expect(applyMessageStatusTransition('sending', 'sent')).toBe('sent')
  })

  it('sending + failed → failed', () => {
    expect(applyMessageStatusTransition('sending', 'failed')).toBe('failed')
  })

  it('sent + failed → sent (no change once confirmed)', () => {
    expect(applyMessageStatusTransition('sent', 'failed')).toBe('sent')
  })

  it('failed + sent → failed (no change once failed)', () => {
    expect(applyMessageStatusTransition('failed', 'sent')).toBe('failed')
  })
})

// ---------------------------------------------------------------------------
// Helpers for building minimal mock Matrix objects
// ---------------------------------------------------------------------------

function makeEvent(
  type: string,
  overrides: Partial<{
    id: string
    sender: string
    body: string
    ts: number
  }> = {},
) {
  return {
    getType: () => type,
    getId: () => overrides.id ?? '$evt1:localhost',
    getSender: () => overrides.sender ?? '@alice:localhost',
    getContent: () => ({ body: overrides.body ?? 'hello', msgtype: 'm.text' }),
    getTs: () => overrides.ts ?? 1700000000000,
  }
}

function makeTimeline(events: ReturnType<typeof makeEvent>[]) {
  return { getEvents: () => events }
}

function makeRoom(
  roomId: string,
  membership: string,
  events: ReturnType<typeof makeEvent>[],
  members: Record<string, { name: string }> = {},
) {
  return {
    roomId,
    getMyMembership: () => membership,
    getLiveTimeline: () => makeTimeline(events),
    getMember: (userId: string) => members[userId] ?? null,
    name: roomId,
  }
}

function makeClient(
  dmMap: Record<string, string[]>,
  rooms: Record<string, ReturnType<typeof makeRoom>>,
) {
  return {
    getAccountData: (type: string) => {
      if (type !== 'm.direct') return null
      return { getContent: () => dmMap }
    },
    getRoom: (roomId: string) => rooms[roomId] ?? null,
    sendTextMessage: vi.fn(),
  } as unknown as MatrixClient
}

// ---------------------------------------------------------------------------
// getDirectRooms
// ---------------------------------------------------------------------------

describe('getDirectRooms', () => {
  it('returns empty array when no m.direct account data', () => {
    const client = {
      getAccountData: () => null,
      getRoom: () => null,
    } as unknown as MatrixClient
    const result = getDirectRooms(client)
    expect(result).toEqual([])
  })

  it('returns empty array when m.direct is empty', () => {
    const client = makeClient({}, {})
    expect(getDirectRooms(client)).toEqual([])
  })

  it('returns room when DM room is joined', () => {
    const room = makeRoom(
      '!room1:localhost',
      'join',
      [makeEvent('m.room.message', { body: 'Hi', ts: 1700000001000 })],
      { '@bob:localhost': { name: 'Bob' } },
    )
    const client = makeClient({ '@bob:localhost': ['!room1:localhost'] }, { '!room1:localhost': room })

    const result = getDirectRooms(client)
    expect(result).toHaveLength(1)
    expect(result[0].roomId).toBe('!room1:localhost')
    expect(result[0].peerUserId).toBe('@bob:localhost')
    expect(result[0].peerName).toBe('Bob')
    expect(result[0].lastMessage).toBe('Hi')
    expect(result[0].lastTimestamp).toBe(1700000001000)
  })

  it('skips room when not joined', () => {
    const room = makeRoom('!room1:localhost', 'invite', [], {})
    const client = makeClient({ '@bob:localhost': ['!room1:localhost'] }, { '!room1:localhost': room })
    expect(getDirectRooms(client)).toHaveLength(0)
  })

  it('skips room when client.getRoom returns null', () => {
    const client = makeClient({ '@bob:localhost': ['!unknown:localhost'] }, {})
    expect(getDirectRooms(client)).toHaveLength(0)
  })

  it('sorts rooms by lastTimestamp descending', () => {
    const room1 = makeRoom(
      '!room1:localhost',
      'join',
      [makeEvent('m.room.message', { ts: 1000 })],
      {},
    )
    const room2 = makeRoom(
      '!room2:localhost',
      'join',
      [makeEvent('m.room.message', { ts: 2000 })],
      {},
    )
    const client = makeClient(
      { '@bob:localhost': ['!room1:localhost'], '@carol:localhost': ['!room2:localhost'] },
      { '!room1:localhost': room1, '!room2:localhost': room2 },
    )
    const result = getDirectRooms(client)
    expect(result[0].lastTimestamp).toBe(2000)
    expect(result[1].lastTimestamp).toBe(1000)
  })

  it('uses userId as peerName when no room member found', () => {
    const room = makeRoom('!room1:localhost', 'join', [], {})
    const client = makeClient({ '@bob:localhost': ['!room1:localhost'] }, { '!room1:localhost': room })
    const result = getDirectRooms(client)
    expect(result[0].peerName).toBe('@bob:localhost')
  })
})

// ---------------------------------------------------------------------------
// getRoomMessages
// ---------------------------------------------------------------------------

describe('getRoomMessages', () => {
  it('returns empty array for unknown room', () => {
    const client = { getRoom: () => null } as unknown as MatrixClient
    expect(getRoomMessages(client, '!unknown:localhost')).toEqual([])
  })

  it('returns messages from room timeline', () => {
    const room = makeRoom(
      '!room1:localhost',
      'join',
      [makeEvent('m.room.message', { id: '$msg1', sender: '@bob:localhost', body: 'Hi', ts: 1700000001000 })],
      {},
    )
    const client = { getRoom: () => room } as unknown as MatrixClient
    const messages = getRoomMessages(client, '!room1:localhost')
    expect(messages).toHaveLength(1)
    expect(messages[0].eventId).toBe('$msg1')
    expect(messages[0].sender).toBe('@bob:localhost')
    expect(messages[0].body).toBe('Hi')
    expect(messages[0].timestamp).toBe(1700000001000)
    expect(messages[0].status).toBe('sent')
  })

  it('filters out non-message events', () => {
    const room = makeRoom(
      '!room1:localhost',
      'join',
      [
        makeEvent('m.room.member'),
        makeEvent('m.room.message', { body: 'Hello' }),
        makeEvent('m.room.name'),
      ],
      {},
    )
    const client = { getRoom: () => room } as unknown as MatrixClient
    const messages = getRoomMessages(client, '!room1:localhost')
    expect(messages).toHaveLength(1)
    expect(messages[0].body).toBe('Hello')
  })

  it('sets localId from event ID', () => {
    const room = makeRoom(
      '!room1:localhost',
      'join',
      [makeEvent('m.room.message', { id: '$evt-abc' })],
      {},
    )
    const client = { getRoom: () => room } as unknown as MatrixClient
    const messages = getRoomMessages(client, '!room1:localhost')
    expect(messages[0].localId).toBe('$evt-abc')
  })
})

// ---------------------------------------------------------------------------
// sendMatrixMessage
// ---------------------------------------------------------------------------

describe('sendMatrixMessage', () => {
  it('calls sendTextMessage and returns event_id', async () => {
    const sendTextMessage = vi.fn().mockResolvedValue({ event_id: '$sent1:localhost' })
    const client = { sendTextMessage } as unknown as MatrixClient
    const result = await sendMatrixMessage(client, '!room1:localhost', 'Hello')
    expect(sendTextMessage).toHaveBeenCalledWith('!room1:localhost', 'Hello')
    expect(result).toBe('$sent1:localhost')
  })

  it('propagates errors from sendTextMessage', async () => {
    const client = {
      sendTextMessage: vi.fn().mockRejectedValue(new Error('Network error')),
    } as unknown as MatrixClient
    await expect(sendMatrixMessage(client, '!room1:localhost', 'Hello')).rejects.toThrow(
      'Network error',
    )
  })
})
