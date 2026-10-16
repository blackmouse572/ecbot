# Ecbot MCP Server

A Cloudflare Worker that lets an MCP client (Claude Code, Codex, Cursor, ...)
work with an Ecbot workspace. It is stateless and holds no secrets: each
request carries the user's client credential, and every tool calls the
`/client` surface of `apps/api` with it through `@repo/client`. `apps/api`
checks the credential and scopes everything to its workspace.

Not to be confused with MCP **Tools** in `apps/api`, where Ecbot is the MCP
client of other servers (see `CONTEXT.md`).

## Tools

Each tool calls one route under `/api/v1/client` and needs the same
permission as the matching route in the app. `tools/list` shows a key only
the tools its creator holds that permission for (see [Auth](#auth)).

The kind sets the tool's annotations (`src/tools/shared.ts`), which clients
use to decide what to confirm with the user: **reads** change nothing,
**adds** only add, **switches** flip something reversible, **overwrites**
replace data, **deletes** remove it.

| Area          | Tool                                                                         | Permission       | Kind       |
| ------------- | ---------------------------------------------------------------------------- | ---------------- | ---------- |
| Chatbots      | `list_chatbots`, `get_chatbot`, `list_chatbot_models`                        | chatbot read     | reads      |
|               | `create_chatbot`                                                             | chatbot create   | adds       |
|               | `update_chatbot` (also chatbot read to change `profile`, `type` or language) | chatbot update   | overwrites |
|               | `activate_chatbot`, `deactivate_chatbot`                                     | chatbot update   | switches   |
|               | `delete_chatbot` (update, as in the app)                                     | chatbot update   | deletes    |
| Conversations | `list_conversations`, `get_conversation`, `list_conversation_messages`       | chatbot read     | reads      |
|               | `reply_to_conversation` (also `openWorldHint`: the customer sees it at once) | chatbot update   | adds       |
|               | `set_conversation_bot`, `set_conversation_status`                            | chatbot update   | switches   |
| Knowledge     | `list_knowledge_bases`, `list_knowledge_items`, `get_knowledge_item`         | knowledge read   | reads      |
|               | `list_chatbot_knowledge`                                                     | knowledge read   | reads      |
|               | `create_knowledge_base`, `create_knowledge_item`                             | knowledge create | adds       |
|               | `get_knowledge_upload_url`, `link_knowledge_to_chatbot`                      | knowledge create | adds       |
|               | `update_knowledge_base`, `update_knowledge_item`                             | knowledge update | overwrites |
|               | `process_knowledge_item`                                                     | knowledge update | switches   |
|               | `delete_knowledge_item`, `unlink_knowledge_from_chatbot`                     | knowledge delete | deletes    |
| Customers     | `list_customers`, `get_customer`, `list_customer_tags`, `get_customer_tags`  | customer read    | reads      |
|               | `create_customer_tag`                                                        | customer create  | adds       |
|               | `update_customer`, `update_customer_tag`                                     | customer update  | overwrites |
|               | `tag_customer`, `untag_customer`                                             | customer update  | switches   |
|               | `delete_customer_tag`                                                        | customer delete  | deletes    |
| Tools         | `list_workspace_tools`, `get_workspace_tool`, `list_chatbot_tools`           | tool read        | reads      |
|               | `create_http_tool`, `create_mcp_tool`                                        | tool create      | adds       |
|               | `update_workspace_tool`                                                      | tool update      | overwrites |
|               | `enable_chatbot_tool`, `disable_chatbot_tool`                                | tool update      | switches   |
|               | `delete_workspace_tool`                                                      | tool delete      | deletes    |
| Skills        | `list_skills`, `get_skill`, `list_chatbot_skills`                            | skill read       | reads      |
|               | `create_skill`, `clone_skill_template`                                       | skill create     | adds       |
|               | `update_skill`                                                               | skill update     | overwrites |
|               | `attach_skill`, `detach_skill`                                               | skill update     | switches   |
|               | `delete_skill`                                                               | skill delete     | deletes    |

The workspace's **Tools** (HTTP endpoints and MCP servers its chatbots call)
are named `*_workspace_tool` and `*_chatbot_tool`, to keep them apart from
this server's own MCP tools.

Not exposed: file uploads, the marketplace installs (they need a browser
for OAuth), and permanent customer erasure.

Every write acts as the user who created the API key: replies are sent as
them, and the workspace activity log records them, as for the same action
in the app. Reading a conversation, its messages or a customer adds a view
to the log the same way.

`get_knowledge_item` and `list_conversation_messages` return text that
customers or uploaded documents wrote (untrusted input, see `CONTEXT.md`);
their descriptions tell the agent to treat it as data, never as
instructions.

To add a tool: add the `/client` endpoint in `apps/api` with the same
ability as its workspace route, run `pnpm generate:client`, then register
the tool in the matching `src/tools/*.ts`, inside the `register*Tools`
group for that ability (so `tools/list` hides it from keys without it).
Give it a `title` and the annotation set for its kind, spread `api` into the
`@repo/client` call so it carries the caller's key, and return through
`respond()`.

## Auth

`POST /mcp` takes a client credential (`key:secret`, labelled "API key" in
the app and shown once at creation) as either:

- `x-api-key: key:secret`
- `Authorization: Bearer key:secret`, for clients that only send bearer tokens

A request without one gets `401`. Requests from a browser `Origin` get `403`
(DNS rebinding protection); MCP clients send no `Origin`.

A key can do at most what the member who created it can do in the workspace
right now, reads and writes alike. On `tools/list` the server asks the API once (`GET /client/v1/me`)
what the key may do and lists only those tools: everything for the owner's
key, none once the member leaves the workspace. Other requests skip that
lookup, because the API checks every call anyway: a tool the member lost
access to after the list was fetched returns a permission error. If the API
can't answer (a wrong or revoked key, an outage), every tool is listed and
each call returns the API's message.

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

The hosted server is `https://mcp.ecbot.dev/mcp`. The user guide, with
Cursor's config too, is the docs page at `ecbot.dev/en/docs/dev/mcp`
(`apps/docs/content/docs/dev/mcp.<lang>.mdx`).

```bash
# Claude Code
claude mcp add --transport http --scope user ecbot https://mcp.ecbot.dev/mcp \
  --header "x-api-key: KEY:SECRET"

# Codex
codex mcp add ecbot --url https://mcp.ecbot.dev/mcp --bearer-token-env-var ECBOT_API_KEY
```

## Commands

```bash
pnpm --filter mcp dev      # wrangler dev --env-file .env
pnpm --filter mcp test     # vitest run
pnpm --filter mcp deploy   # wrangler deploy
```
