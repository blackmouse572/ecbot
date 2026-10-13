# ADR-0009: Reconciled history is stored, not answered

- **Status**: Accepted (2026-10-13)
- **Follows**: ADR-0008 (Inbound Inbox on Cloud Tasks)
- **Issue**: #284

## Context

The hourly reconciliation sweep (`InboundReconciliationScheduler`) asks each adapter for the last 25h of messages and feeds them through `InboundInboxService.accept`, the same intake as live webhooks. Nothing told the Turn that these events were history, so each replayed customer message ran the full pipeline: profile fetch, persistence, handoff check, typing, read receipt and reply generation.

On Messenger the reply then failed. Sends use `messaging_type: "RESPONSE"`, which only delivers inside the 24h window, and much of the replay is older than that. Token usage is recorded before delivery, so every failed reply still cost tokens. Imported conversations also showed no name or avatar: page-first imports (echo events) never fetched a profile, and an empty lookup was stamped as fetched and cached for 7 days.

## Decision

Replayed history is imported, never answered.

- `PlatformWebhookEvent.replayed` marks an event re-emitted by the sweep. The scheduler sets it on every event it accepts, so every adapter's `reconcile()` is covered without each one setting it. Live webhooks leave it unset.
- The marker is a plain field of the event, so it survives the whole ingress: inbox accept, Cloud Task payload (JSON), task controller DTO, `MessageProcessorService.process()`.
- A replayed customer message keeps the dedupe claim, refreshes the customer's identity, stores the message and bumps `lastMessageAt`, then stops. It skips action dispatch, the classifier, reopening a resolved conversation, the handoff check, typing, read receipts and reply generation.
- The next live message runs the full Turn as before, including when the import created the conversation.
- Sender-profile refresh is one routine shared by the customer-message and echo paths. A lookup that yields neither a name nor an avatar is not stamped as fetched, so the next event retries.
- Messenger's `reconcile()` also reads the conversation's `participants` and sets `senderName`, so imports get a name even when the profile API returns nothing.

## Consequences

- No tokens are spent on replies the platform will reject.
- A customer message the live webhook missed (an outage) and the sweep later recovers is stored in the inbox but gets no automatic reply. An operator sees it there. Telling "missed during an outage" apart from "old history" safely would need per-platform window checks, which is out of scope.
- Already-failed outbound messages and already-metered tokens are not cleaned up.
- An empty profile lookup now retries on every event for that customer until the platform returns something. The lookup is one Graph call per inbound event, and the conversation-level cache still applies once a name or avatar is found.
