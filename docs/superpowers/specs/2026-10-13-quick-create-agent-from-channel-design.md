# Quick create an agent from a channel

## Context

Issue: [#280](https://github.com/blackmouse572/ecbot/issues/280) (enhancement).

The Channels list shows name, status, type and last update, and a channel's detail page says nothing when no agent answers on it: `AccountChatbotSection` explicitly returns `null` (`apps/app/src/routes/accounts/accounts-details/components/account-chatbot-section/account-chatbot-section.tsx`). An owner who lands on a channel page therefore cannot see or start an agent from there.

The data already exists: `AccountEntity.chatbot` is a nullable relation (`apps/api/src/modules/account/repository/entities/account.entity.ts`), but the accounts list never populates it and `AccountListResponseDto` has no field for it.

What the owner asked for, in their words:

1. Channels table: a column showing the agent.
2. Channel details: when no agent is connected, an empty display plus a quick action that opens chatbot creation for this channel.
3. The quick action prefills the create flow with the channel's name and pre-connects the channel on the connect question.

## Owner decisions (from the design conversation)

- The quick action lands in the existing agent builder (`/chatbot/create`), carrying the channel along.
- The channel name lands in the business-name question, still shown and editable (prefilled, not skipped). The agent-name question still names the agent.
- The channel is pre-connected to the draft: once the builder has created the draft (right after the agent name is answered), the channel is linked through the existing guarded link endpoint, so the connect question already shows it connected.

## Goals

- A channel can tell an owner which agent answers on it.
- From an agent-less channel, creating an agent is one click and never asks the owner to reconnect that channel.

## Non-goals

- No new chatbot creation form or modal; the conversational builder stays the only path.
- No change to how agents are linked elsewhere (chatbot details drawer, builder connect question).
- No sorting or filtering of the channels table by agent.

## Anti-goals

- Never move a channel the server guard rejects: an account already owned by another live agent must not be relinked, and the owner must not see a broken connected state.
- Never pre-connect types the builder does not connect (user-level `FACEBOOK_ACCOUNT`, `API_CHANNEL`).
- No silent failure: if the pre-connect does not happen, the owner can still connect manually, or is told why.

## Constraints

- `apps/api` work follows the `eccho-backend` skill; `apps/app` work follows `eccho-frontend`.
- API response shapes are generated into `@repo/client`; any DTO change requires `pnpm generate:client` (AGENTS.md).
- All new copy goes to both `apps/app/src/i18n/translations/en.json` and `vi.json`; no em dash in product text (AGENTS.md).
- Test-first; kebab-case files; minimum code.
- The repo freeze rule commits engine changes to `blackmouse572/ecbot` as a branch + PR (this worktree is that kind of change).

## The parts of the how (decided)

### 1. Channels list gets the agent

- `GET /:workspace/account` (`AccountController.list`) populates each account's `chatbot` and returns a summary `{ id, name }` (`null` when none). `AccountListResponseDto` gets the field; regenerate the client.
- App: a new "Agent" column in `use-account-table-columns.tsx` after `type`:
  - linked: the agent's name, linking to the agent detail page (`/{slug}/chatbot/{id}`);
  - none: a muted dash, same treatment as the missing `updatedAt` cell.
- The unlinked list endpoint is unaffected by definition (its accounts have no chatbot). The admin list keeps returning `null` for the field.

### 2. Channel details empty display

- `AccountChatbotSection` stops returning `null` for the loaded-without-agent case. It renders an empty card (title "Agent") with a one-line message and a create action.
- The action leads to `/{workspaceSlug}/chatbot/create?accountId=<account id>`. The route param is `accountId`, matching the existing `chatbotId` style.
- The card and quick action appear for every channel type except `FACEBOOK_ACCOUNT` (user-level accounts are never a connectable channel) and `API_CHANNEL` (the builder deliberately does not connect server integrations; agents for those are attached from the chatbot side). Nothing renders while loading, same as today.
- The linked case is unchanged (existing `ChatbotSection`).

### 3. Builder prefill

- `AgentBuilder` reads `accountId` from the URL, loads that account, and passes `{ id, name, type }` into `useAgentBuilder` as a prefill account. The param is only honored when creating (no `chatbotId` in the URL).
- Business name: once the builder starts (template or description), the profile's `businessName` is seeded with the channel name when empty. The question is still asked, with the value in the input; the owner can edit it. A `restart` clears the profile, so the seed re-applies on the next start; a name the owner typed is never overwritten.
- Account load: the start path waits for the prefill account to resolve, because the seed must be in the profile before the business-name question mounts (its input state is captured once). If the account fails to load (stale id, other workspace, transient error), the builder runs as a normal create with no prefill and shows a one-line notice.
- Pre-connect: when `state.chatbotId` first becomes set (the draft exists, i.e. after the agent name), the builder links the prefill account through the existing guarded link endpoint, then records it in `linkedAccounts` so the connect question shows it as connected. Runs once per builder session.
- Failure: a `skipped` result (owned by another agent) shows the existing "channel already in use" copy; a request error shows a distinct notice. Either way the builder stays usable and the owner can still connect channels manually.
- Personal business types have no connect question, but the draft hook is the same, so the channel is pre-connected there too.

## i18n

- Column header reuses `chatbot.title` ("Agent" / "Agent").
- New keys for the empty card (title, message, action label) and for the pre-connect and account-load failure notices; both `en.json` and `vi.json`. The plan names them exactly.

## Left to the builder (implementation choices)

- The MikroORM populate/select mechanics for the account list, and the defensive mapping if the relation is not loaded; whether the summary mapping lives in `mapList` or the controller.
- How the prefill account flows through builder state (reducer field vs a ref at hook level) and where the auto-link effect lives (`use-agent-builder` vs a small dedicated hook).
- Whether the empty card reuses `NoRecords` or a simpler container; exact key names; toast vs inline error for the skipped pre-connect.
- Exact tests: extend `apps/api/test/modules/account/controllers/account.controller.spec.ts` for the chatbot summary; app tests for the column cell, the empty card, and the builder prefill/auto-link behavior.

## Calls I made (owner: check these)

- Agent-less rows in the table show a muted dash, with no inline quick-create; the quick action lives on the detail page only.
- The details card renders nothing while loading; an empty card for every type except `FACEBOOK_ACCOUNT` and `API_CHANNEL` (your gate above).
- URL param name `accountId`.
- No new table filter or sort for the column.
- The builder waits for the account load before start; a failed load degrades to a normal create with a notice instead of blocking entry.
- Distinct copy for a request failure versus a channel owned by another agent (which reuses the existing "already in use" string).
