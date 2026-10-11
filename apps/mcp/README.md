# Ecbot MCP Server

A Cloudflare Worker that lets an MCP client (Claude Code, Codex, Cursor, ...)
work with an Ecbot workspace. It is stateless and holds no secrets: each
request carries the user's client credential, and every tool calls the
`/client` surface of `apps/api` with it through `@repo/client`. `apps/api`
checks the credential and scopes everything to its workspace.

Not to be confused with MCP **Tools** in `apps/api`, where Ecbot is the MCP
client of other servers (see `CONTEXT.md`).

## Tools

All read-only (`readOnlyHint`), each a `GET` on `/api/v1/client`:

| Tool                         | API path                                      |
| ---------------------------- | --------------------------------------------- |
| `list_chatbots`              | `/chatbots`                                   |
| `get_chatbot`                | `/chatbots/:id`                               |
| `list_knowledge_bases`       | `/knowledge-bases`                            |
| `list_knowledge_items`       | `/knowledge-bases/:knowledgeBaseId/items`     |
| `get_knowledge_item`         | `/knowledge-bases/:knowledgeBaseId/items/:id` |
| `list_conversations`         | `/conversations`                              |
| `get_conversation`           | `/conversations/:id`                          |
| `list_conversation_messages` | `/conversations/:id/messages`                 |
| `list_customers`             | `/customers`                                  |
| `get_customer`               | `/customers/:id`                              |

Reading a conversation, its messages or a customer adds a view to the
workspace activity log, by the user who created the API key, as the same read
does in the app.

`get_knowledge_item` and `list_conversation_messages` return text that
customers or uploaded documents wrote (untrusted input, see `CONTEXT.md`);
their descriptions tell the agent to treat it as data, never as
instructions.

To add a tool: add the `/client` endpoint in `apps/api`, run
`pnpm generate:client`, then register the tool in the matching
`src/tools/*.ts` with a `title` and `readOnlyHint` or `destructiveHint`,
spreading `api` into the `@repo/client` call so it carries the caller's key,
and returning through `respond()`.

## Auth

`POST /mcp` takes a client credential (`key:secret`, labelled "API key" in
the app and shown once at creation) as either:

- `x-api-key: key:secret`
- `Authorization: Bearer key:secret`, for clients that only send bearer tokens

A request without one gets `401`. A wrong or revoked key surfaces as a tool
error with the API's message. A key can do at most what the member who
created it can do in the workspace right now: a tool their role doesn't allow,
or any tool once they leave the workspace, returns a permission error. Requests from a browser `Origin` get `403`
(DNS rebinding protection); MCP clients send no `Origin`.

## Config

`SERVER_URL` (the `apps/api` base URL) is read from `process.env` and
validated at startup by `src/env.ts`, as in `apps/edge`. Locally it comes from
`.env` (see `.env.example`).

`wrangler.json` is not committed (`apps/*/wrangler.json` is gitignored; the
hosted config is copied in at build time). It needs `"main": "src/index.ts"`,
`"compatibility_flags": ["nodejs_compat"]`, a `compatibility_date` of
2025-04-01 or later (so vars reach `process.env`), `SERVER_URL` under `vars`,
and the route for the server's domain.

## Connect

```bash
# Claude Code
claude mcp add --transport http --scope user ecbot https://<mcp-host>/mcp \
  --header "x-api-key: KEY:SECRET"

# Codex
codex mcp add ecbot --url https://<mcp-host>/mcp --bearer-token-env-var ECBOT_API_KEY
```

## Commands

```bash
pnpm --filter mcp dev      # wrangler dev --env-file .env
pnpm --filter mcp test     # vitest run
pnpm --filter mcp deploy   # wrangler deploy
```
