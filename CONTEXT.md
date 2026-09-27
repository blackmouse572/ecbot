# Ecbot

Ecbot is a multi-platform AI agent platform: operators build an agent once (persona, knowledge, tools, behavioral **Archetype**) and deploy it across messaging and marketplace accounts (Facebook Messenger, Zalo, Telegram, the website widget and the REST API channel today; Instagram, Shopee and TikTok Shop are on the roadmap), with humans able to step in when needed. Customer service is the default archetype and conversational commerce the flagship use case; the same engine also runs assistant/helper agents. This glossary fixes the language of the domain so terms stay consistent across code, UI, and docs.

## Core entities

**Workspace**:
The top-level tenant that owns chatbots, accounts, knowledge, and billing. A workspace has many **Chatbots** and many **Accounts**.

**Chatbot**:
A configured AI agent — its persona, knowledge, tools, handoff rules, and **Archetype**. One chatbot drives many **Accounts** (all inherit its archetype). Each chatbot can have a distinct "taste" or approach.
For chatbot/AI implementation details, see [`apps/ai/README.md`](/apps/ai/README.md).
_Avoid_: bot config, agent profile.

**Archetype**:
The behavioral kind of a **Chatbot** — customer service (default), personal assistant, helper, … — resolved from a set of orthogonal **capabilities** (four today — _customer tracking_, _human handoff_, _identity concealment_, _show tool activity_ — from an **open code registry**, stored as `capabilities` JSON so the set grows without migrations). An archetype is a named default bundle for those capabilities; a chatbot may override individuals (then it is "Custom"). Distinct from the vertical `ENUM_CHATBOT_TYPE` (beauty/fashion/… — an _industry_ axis, not a behavioral one).
_Avoid_: mode, type (reserve **type** for the vertical enum).

**Agent Template**:
A reusable starting point for creating a **Chatbot**, driving the creation wizard: it bundles an **Archetype**'s toggle defaults, a data-driven field schema (the tailored inputs the wizard collects), a prompt scaffold, and default config. `visibility: system | workspace | public` (public/community sharing is deferred). The template is the _origin_ of a chatbot's config, not a live dependency.
_Avoid_: preset (informally fine, but "template" is canonical for the entity).

**Account**:
A connected external presence on one platform — a Facebook Page, Zalo OA, Telegram bot, website widget or API channel. (`ENUM_ACCOUNT_TYPE` also declares Instagram, Shopee and TikTok Shop; those adapters are not implemented yet.) An account is assigned to at most one **Chatbot** at a time; that assignment is mutable.
_Avoid_: page, channel, integration (when you mean the connected presence).

**Operator**:
A human workspace member who monitors conversations, takes over from the bot, and resolves threads.
_Avoid_: agent (reserve "agent" for the AI chatbot), user (reserve "user" for the end customer's authored messages).

**Conversation**:
A thread between one **ContactPoint** and a **Chatbot** on a specific **Account**. Uniquely identified by (chatbot, account, contactPoint). The **Customer** is derived through the ContactPoint. A conversation is permanently owned by the chatbot that was handling it when it was created — reassigning the account to a new chatbot only affects _future_ conversations.
_Avoid_: chat, ticket, thread (informally fine, but "conversation" is canonical).

**Tool**:
A named capability a **Chatbot** can invoke during a conversation to read or change the world — e.g. _create order_, _look up product_, _book appointment_, _call a customer's API_. Each tool has a JSON-schema for its inputs and a description the LLM uses to decide when to call it. In Ecbot the word **Tool** is the umbrella that covers both kinds below; this is broader than the AI-industry usage where MCP is often spoken of as a separate concept.
A tool is one of two **kinds**:

- **HTTP** — a workspace-defined wrapper around an operator's own REST endpoint(s). (UI label: "Custom API".)
- **MCP** — a workspace-defined connection to a Model Context Protocol server.

`MCP` tools carry a **provider** discriminator: `COMPOSIO | ECCHO | OPERATOR` — installed via the Composio marketplace, operated by Ecbot first-party, or a custom MCP URL the operator supplied directly. A `BUILT_IN` kind was considered and dropped during brainstorming; built-in capabilities live as services inside `apps/api`, not as registry rows.

Tools belong to a **Workspace**; each **Chatbot** opts in to the ones it wants. A **tool call** is one LLM-initiated invocation; a **ToolInvocation** is the persisted record of that call (args, result, latency, error). Distinct from a **Guardrail** (passive screening) and from a **knowledge** lookup (read-only retrieval; tools may also act).
_Avoid_: "function call" (legacy LLM-API term — say **tool call**; the existing `ORDER_MANAGEMENT_FUNCTIONS` is the pre-Tool-Registry artifact), "skill" (now a distinct concept — a **Skill** is instruction know-how, not a callable), "plugin", "action".

**ToolInvocation**:
A single call from a chatbot to a **Tool**, logged with input args, output result (or error), duration, and a correlation id. Persisted on inbound-conversation tool calls (joined back to the conversation via `conversation_id` for the operator's retrospective view). Hard-deleted after 30 days by the `ToolInvocationPruneScheduler` (audit-log retention; opts out of `DatabaseEntityBase` soft delete).

**Skill**:
Reusable procedural know-how a **Chatbot** loads on demand — markdown instructions that teach the agent _how_ to handle a kind of request using the **Tools** it already has (e.g. "when a customer asks for a refund: apologize → ask for the order code → …"). Unlike a **Tool**, a Skill is text, not a callable; it does not read or change the world by itself. The agent sees only each attached skill's name+description until it calls `load_skill(slug)` to pull the full body into context (progressive disclosure). Instructions live on S3; the `skills` row holds metadata + an embedded S3 pointer.
A skill is **builtin** (`workspace_id = NULL` — an Ecbot-authored template managed by admins) or **workspace-owned**. Adding a builtin _clones_ it into an editable, workspace-owned copy (copy-on-add); only workspace-owned skills attach to a **Chatbot**. Skills are decoupled from Tools — a skill's instructions may name tools freely, but there is no enforced link. The handoff/followup _mechanisms_ stay as system tools, not skills.
_Avoid_: "tool" (a Skill is know-how, not a callable — reserve **Tool** for HTTP/MCP callables), "plugin", treating the per-chatbot system prompt as a Skill (a Skill is a reusable, on-demand unit).

## Customer & identity

These terms separate _the human_ from _the platform identity they message from_. The split exists so that profile, tags, and memory persist across platforms while replies still route through the correct platform identity.

**Customer**:
The human a **Chatbot** is talking to, workspace-scoped. Carries the persistent profile (name, language, contact details, free-form metadata, profile summary) and **Customer Tags**. A Customer can have many **ContactPoints** (one per platform identity they have written from) and survives across **Conversations**. Created on first inbound message from a new ContactPoint; linked to other Customers in the workspace only by operator-confirmed merge.
_Avoid_: end-user, contact, lead (CRM-flavored terms with different baggage).

**ContactPoint**:
A platform-specific identity under one **Customer** — uniquely `(workspace, platform, externalSenderId)`. Holds the platform-fetched display name, avatar, and last-fetched timestamp. One Customer has many ContactPoints; one ContactPoint belongs to exactly one Customer at a time.
_Avoid_: sender record, identity, profile (too generic).

**Sender**:
Informal usage for the human authoring a customer-side message — i.e., the **Customer** behind a **ContactPoint**. Acceptable in prose ("sender message", "sender profile") but **Customer** is the entity. Used in this glossary lowercase, never as a noun for the entity.

**Customer Tag**:
A workspace-level label attached to a **Customer** (`Hot lead`, `VIP`, `Angry`, etc.). Catalog is defined per workspace with name, optional emoji, agent-facing description, and a `triggersHandoff` flag. Applying a `triggersHandoff=true` tag fires an **Escalation** (same path as fallback threshold and handoff keyword) so real-time signals like "Angry" flow through the existing handoff rails. Analytical tags (`Hot lead`, `Returning customer`, etc.) are written by a background classifier at end-of-conversation, not mid-turn.
_Avoid_: label, status (already taken), category.

**Customer Merge Suggestion**:
A pending operator-confirmed proposal to merge two **Customers** in the same workspace because their phone or email matched. The agent never sees pending suggestions — only confirmed unified Customers. Resolved by operator action: `MERGED` (loser soft-deleted with `mergedIntoCustomerId` set; ContactPoints and Conversations reparent to the survivor) or `DISMISSED`. Soft-delete preserves the unmerge path.
_Avoid_: duplicate, link.

## Conversation state

These two concepts are **independent** — keep them separate. Collapsing them is the historical mistake this glossary corrects.

**Bot enabled**:
Whether the **Chatbot** replies automatically (on) or an **Operator** is handling the conversation manually (off). A boolean toggle, independent of lifecycle.
_Avoid_: paused, active (these conflated bot-state with lifecycle).

**Status**:
The conversation lifecycle: `OPEN` (live, in the active inbox) or `RESOLVED` (finished, archived).
_Avoid_: closed (say **Resolved**), AUTO/PAUSED (retired — those mixed bot-state into status).

**Escalation** (a.k.a. **Handoff**):
The automatic event where the bot turns **Bot enabled** off and raises an alarm (operator notification + unread indicator) because it is stuck (fallback threshold), the customer asked for a human (handoff keyword), or a **Guardrail** flagged the message as an attack/abuse. Distinct from an operator _manually_ turning the bot off, which is quiet.
_Avoid_: pause (ambiguous — say escalation for the automatic, alarmed case).

**Guardrail**:
A per-**Chatbot**-configurable screening layer that inspects messages independently of the main AI. An _input guardrail_ checks an incoming **sender** message for attacks/abuse (prompt injection, jailbreak, toxicity) before the bot replies; an _output guardrail_ checks the bot's drafted reply for leaked secrets, PII, or off-brand content before it is sent. Probabilistic (defense-in-depth) — distinct from _structural_ controls like keeping secrets out of the model context. A guardrail block can trigger an **Escalation**.
_Avoid_: filter, moderation (say guardrail for this configurable screening layer).

**Resolve**:
The operator action that ends a conversation: sets status to `RESOLVED` and resets it to a clean slate (bot re-enabled, handoff state cleared).

**Reopen**:
Bringing a `RESOLVED` conversation back to `OPEN`, with the bot re-enabled. Happens automatically when the customer sends a new message, or manually by an operator. A new message after resolution is treated as a new episode.

**Read**:
The state of a **Conversation** from a specific **Operator**'s perspective. An operator reads a conversation by opening it in the conversation detail view. All **sender** messages visible at that point are considered read.
_Avoid_: viewed, seen, acknowledged.

**Unread count**:
The number of **sender** (customer) messages in a **Conversation** received since the **Operator** last read it. Tracked per-operator, server-side. Only sender messages count — **Chatbot** and **Operator** messages do not increment the unread count.
_Avoid_: new messages, unseen messages.

## Inbound flow

How a platform message becomes a reply. These terms were fixed during the architecture review of the webhook → reply path (`apps/api/src/modules/platform`); they replace the older fire-and-forget framing.

**Inbound Inbox**:
The module that owns a platform message from receipt to completion. Its intake seam (`accept`) enqueues the raw event as a durable **Inbound event** before the webhook ACK; its turn seam drains that job through the **Turn** pipeline. Replaces the controller-orchestrated, ack-then-process flow.
_Avoid_: webhook handler, ingestion service, message queue.

**Inbound event**:
The durable queued job representing one received platform message — durable in Redis (BullMQ, AOF-persisted), not a Postgres row. On the BullMQ-drained (direct-to-api) path it's deduped by its job id `${platform}-${externalMessageId}`; completed-job retention sets the dedupe window so redeliveries within it are no-ops.

As of the edge multi-platform cutover, a second ingress path (edge-forwarded, via the Cloudflare Worker) also feeds the **Turn** pipeline without going through this BullMQ job — so job-id dedupe alone no longer covers every path an **Inbound event** can arrive by. The actual single dedupe point is now a shared seam at the top of `MessageProcessorService.process()`: a Redis `SET NX` claim on `${platform}:${externalMessageId}` (24h TTL), checked regardless of ingress path. The BullMQ job id stays as redundant defense-in-depth on the direct-to-api path.
_Avoid_: webhook payload, raw message, inbox row.

**Inbox lag**:
The backlog of **Inbound events** accepted but not yet turned into a reply — measured as **depth** (count of `waiting + delayed` jobs on the inbound queue) and **oldest age** (how long the oldest `waiting` job has sat). The primary availability signal for the ingestion pipeline: a stalled or dead worker shows up as rising oldest age. Breaching a configured threshold raises an **ops alert** (engineer-facing) — distinct from an **Escalation** alarm (operator-facing).
_Avoid_: queue size, PENDING depth, `inbound_events` backlog (there is no such table).

**Turn**:
The processing of one **Debounce burst** into one **Chatbot** reply: resolve customer → persist → gate → debounce → generate → send. The unit a worker drains from the **Inbound Inbox**.
_Avoid_: request, transaction, run.

**Debounce burst**:
The rapid-fire **sender** messages collapsed into a single **Turn** while the debounce window is open, so the agent replies once to the newest context.
_Avoid_: batch, group.

**Turn context**:
What apps/ai receives for one **Turn**: the conversation history, the burst's message, and the burst's images. Built from the database each Turn, because the agent keeps no state between Turns. The burst is the customer's last messages, even when a reply to an earlier burst was saved between them. History notes what the customer showed in images, but leaves out the bot's own images. A follow-up has no burst, so every recent message is history.
_Avoid_: prompt context, chat history (when you mean all three parts).

**Image description**:
What the AI saw in one customer image: a neutral description, the image's visible text, and which catalog product it shows when the operator instructions carry product images. Made once per image, when the **Turn** that answers it starts, and kept on the image so later Turns remember it. A description the input **Guardrail** would block is not kept; the image then reads as one that could not be viewed.
_Avoid_: caption (the customer writes a caption; the AI writes a description).

**Generation lease**:
The claim a **Turn** holds on being the newest context for its **Conversation** — a per-conversation epoch in Redis. Every inbound message bumps the epoch; a reply generation captures it at the start and re-checks mid-stream and before send, aborting the AI stream and discarding instead of sending a stale reply when superseded. Aborting the stream drops the `api↔ai` connection so `apps/ai` stops generating (no wasted tokens).
_Avoid_: lock, mutex, cancellation token.

## Trust & secrets

**Platform credential**:
The OAuth access/refresh token Ecbot holds for a connected **Account** (Facebook Page token, Zalo OA token, etc.). Owned by the **Operator** who connected the account; Ecbot is custodian and must protect it at rest. Distinct from the deployment's own platform secrets (LLM keys, payment-provider keys) and from tool credentials.
_Note_: LLM access has two modes. **Self-hosted** — the deployment supplies its own provider key (`OPENROUTER_API_KEY`) and pays the provider directly. **Ecbot Cloud** — Ecbot-owned keys, metered; that metering lives outside this repository.

**Client credential**:
A workspace-owned key that lets a third-party client (a website chat widget, an MCP client, a chat adapter) call Ecbot on behalf of the **Workspace**. Created, named, and revoked by an **Operator**, with an optional expiry; authenticated by an `x-api-key` header, and the **Workspace** it acts for is derived from the credential itself, not from the URL. The secret is shown once at creation (and again only on rotation) and is never recoverable afterward; revoking it stops it working immediately. Scoped to the whole **Workspace** — it does not bind to a single **Chatbot**. Distinct from a **Platform credential** (an OAuth token Ecbot holds _for_ a connected **Account**) and from Ecbot's own system/global API key.
_Avoid_: integration, api token (say **client credential**; "API key" is the operator-facing UI label).

**Untrusted input**:
Anything authored outside the workspace trust boundary — a **sender**'s chat messages and the text of uploaded knowledge documents. Knowledge documents are readable by the deployment's own services, which RAG embedding requires; encryption is at the storage layer and under the deployment's control. Untrusted input must never be treated as instructions to the bot.
_Avoid_: treating sender messages and operator configuration as the same trust level.

## Flagged ambiguities

- **"Agent"** — In this domain "agent" = the AI chatbot. Humans are **Operators**. Do not call operators "agents."
- **"Account"** — Always the connected platform presence, never the **Customer** and never a billing account.
- **"Close" vs "Resolve"** — There is no separate "close." Resolving _is_ closing.
- **"Customer" vs "Sender" vs "ContactPoint"** — **Customer** is the human entity. **ContactPoint** is one platform identity under that human. "sender" is informal prose for the same human, never an entity. A reply is routed via the **Account** the **ContactPoint** lives on, not the Customer.
- **"System tool" vs Tool Registry tool** — Internal capabilities the agent uses against Customer state (read/write fields, apply tags) are **system tools**: hardcoded in the agent factory, invisible to operators, not part of the Tool Registry. Tool Registry tools are user-configurable per chatbot; system tools are not.

## Example dialogue

> **Operator:** A customer keeps asking weird questions and the bot's stuck — it escalated to me.
> **Dev:** Right, so the bot hit the fallback threshold, that's an _escalation_: it set bot-enabled to off, stamped handoff, and pinged you. The conversation is still `OPEN`.
> **Operator:** I handled it. If I just turn the bot back on, does it forget everything?
> **Dev:** No — re-enabling the bot keeps its context and clears the handoff. It only starts fresh if you _resolve_ the conversation, because resolving is a clean slate.
> **Operator:** And if the same person messages next week?
> **Dev:** That reopens it — back to `OPEN` with the bot on. New episode, same conversation thread.
