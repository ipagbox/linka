# Product

Linka is a private, invite-only, self-hosted messaging system for trusted contacts.

---

## Core principles

- **Private by design.** No public registration, no public channels, no discoverability.
- **Invite-only.** Every user requires a valid invite link from the host.
- **Self-hosted.** The system runs on infrastructure you control. No third-party messaging servers.
- **Matrix-backed.** Messages are stored and delivered by a Synapse homeserver. The control-plane never touches message content.

---

## User journeys

### Joining

1. User receives an invite link: `https://your-domain/invite/<token>`
2. User opens the link in a browser.
3. If the invite is valid: onboarding form is shown (display name input).
4. User enters their display name and confirms.
5. A Matrix account is created automatically.
6. Session is saved in the browser.
7. User enters the app.

### Signing back in

1. User opens the app.
2. Session is loaded from local storage.
3. Token is validated against the Matrix homeserver.
4. If valid: app opens directly.
5. If expired or invalid: user sees the placeholder screen (no auto-redirect to invite flow).

### Direct messaging (Stage 5)

1. User opens the app.
2. Chat list is shown — one entry per direct conversation.
3. User clicks a conversation to open it.
4. Message timeline is shown (most recent messages).
5. User types a message and presses Send.
6. Message appears immediately in the timeline with status "sending".
7. Once the server confirms: status updates to "sent".
8. If the server rejects: status shows "failed" with a Retry button.
9. Incoming messages from the other user appear in real time via Matrix sync.

---

## Message states

| State    | Meaning                                          |
|----------|--------------------------------------------------|
| sending  | Message submitted locally, awaiting server ack   |
| sent     | Server accepted the message                      |
| failed   | Server rejected or network error; retry available |

---

## What is not in scope (current stages)

- Group chats
- File and image attachments
- Push notifications
- Voice or video calls
- Federation (multiple homeservers)
- Message editing or deletion
- Read receipts / typing indicators (future stage)
- Encryption UX controls

---

## Access control

- New users must have a valid invite token.
- Invite tokens are single-use (or limited multi-use) and expire.
- The control-plane enforces invite logic; the Matrix homeserver handles credentials.
- There is no self-service registration path.
