# Quick Create an Agent from a Channel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An agent-less channel page can tell which agent answers on it and start an agent in one click, with the channel prefilled and pre-connected in the builder.

**Architecture:** The API exposes a trimmed `chatbot: { id, name } | null` on the account list (populated relation, mapped defensively). The app adds an Agent column, replaces the empty chatbot card on the channel details sidebar with a quick-create action, and teaches the agent builder to accept `?accountId=`: it seeds the business-name answer with the channel name and links the channel to the draft once the draft exists.

**Tech Stack:** NestJS 11 + MikroORM 6 + Jest (`apps/api`); React 19 + TanStack Query + Vitest (`apps/app`); hey-api `openapi-ts` generation into `packages/client`.

**Spec:** `docs/superpowers/specs/2026-10-13-quick-create-agent-from-channel-design.md`

## Global Constraints

- `apps/api` work follows the `eccho-backend` skill; `apps/app` work follows `eccho-frontend` (both loaded by AGENTS.md rules).
- Any API DTO change requires regenerating `@repo/client` via `pnpm generate:client` (needs `apps/api/swagger.json`, written when the API boots in non-production).
- New copy goes to **both** `apps/app/src/i18n/translations/en.json` and `vi.json`; no em dash in product text.
- Test-first; kebab-case files; minimum code; one concern per file.
- Engine changes ship to `blackmouse572/ecbot` as a branch + PR (this worktree is that branch).
- `apps/app`'s `check-types` is a known no-op (issue #18) — do not rely on it.

## Review Focus

The spec implies these input classes; each maps to a test in its task.

1. Channel already owned by another agent at pre-connect time → link returns `skipped`: no connected state, "already in use" toast, builder stays usable (Task 4).
2. Account cannot be loaded (stale id, other workspace, error) → one notice, plain create, no link attempt (Task 4).
3. Non-connectable type passed via URL (`FACEBOOK_ACCOUNT`, `API_CHANNEL`) → no name seed, no link (Task 4).
4. Transient pre-connect failure (network) → distinct notice, builder stays usable (Task 4).
5. Agent-less channel row (`chatbot` null, absent, or soft-deleted) → muted dash in the table, `null` summary from the API (Tasks 1 and 2).

---

### Task 1: The channel list returns each channel's agent

**Files:**
- Modify: `apps/api/src/modules/account/dtos/response/account.list.response.dto.ts`
- Modify: `apps/api/src/modules/account/controllers/account.controller.ts` (list handler only)
- Modify: `apps/api/src/modules/account/services/account.service.ts` (`mapList` only)
- Test: `apps/api/test/modules/account/services/account.service.spec.ts`, `apps/api/test/modules/account/controllers/account.controller.spec.ts`
- Generated: `packages/client/src/client/types.gen.ts` (via `pnpm generate:client`)

**Interfaces:**
- Produces: `AccountChatbotSummary { id: string; name: string }`; `AccountListResponseDto.chatbot: AccountChatbotSummary | null` (`null` for absent **and** soft-deleted chatbots, matching `findAccountsNotBelongingToAnyChatbot`).
- Produces: the workspace list query populates `chatbot`; `mapList` trims it to `{ id, name }` and never leaks other chatbot fields.

- [ ] **Step 1: Write the failing tests**

In `account.service.spec.ts`, add a `describe('AccountService - mapList')` using `buildService()`:

```ts
const entity = (toObject: () => Record<string, unknown>) =>
    ({ toObject }) as any;

it('trims the linked chatbot to id and name', () => {
    const [mapped] = buildService().mapList([
        entity(() => ({
            id: 'account-1',
            name: 'Axios Page',
            chatbot: { id: 'bot-1', name: 'Axios Bot', generalKnowledge: 'secret' },
        })),
    ]);
    expect(mapped.chatbot).toStrictEqual({ id: 'bot-1', name: 'Axios Bot' });
});

it('returns null when the channel has no chatbot', () => {
    const [mapped] = buildService().mapList([
        entity(() => ({ id: 'account-1', name: 'Axios Page' })),
    ]);
    expect(mapped.chatbot).toBeNull();
});

it('returns null when the linked chatbot is soft-deleted', () => {
    const [mapped] = buildService().mapList([
        entity(() => ({
            id: 'account-1',
            name: 'Axios Page',
            chatbot: { id: 'bot-9', name: 'Old Bot', deletedAt: new Date() },
        })),
    ]);
    expect(mapped.chatbot).toBeNull();
});
```

In `account.controller.spec.ts`, inside the existing `describe('list')`, add:

```ts
it('populates the chatbot relation so rows can name their agent', async () => {
    await controller.list(workspace, pagination, {});

    expect(accountService.findAll).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
            populate: expect.arrayContaining(['chatbot']),
        })
    );
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter api test -- test/modules/account/services/account.service.spec.ts test/modules/account/controllers/account.controller.spec.ts`
Expected: FAIL — `chatbot` still carries `generalKnowledge` / is `undefined`, and `populate` lacks `'chatbot'`.

- [ ] **Step 3: Implement**

In `account.list.response.dto.ts`, add above `AccountListResponseDto` (mirror the non-exported `AddedBy` pattern):

```ts
class AccountChatbotSummary {
    @ApiProperty({ description: 'Chatbot ID' })
    id: string;

    @ApiProperty({ description: 'Chatbot name' })
    name: string;
}
```

and the field on `AccountListResponseDto`:

```ts
    @ApiProperty({
        description:
            'The chatbot answering on this channel; null when none is linked (a soft-deleted chatbot counts as none)',
        type: AccountChatbotSummary,
        nullable: true,
    })
    chatbot: AccountChatbotSummary | null;
```

In `account.controller.ts` `list`, extend the populate (leave `AUDIT_POPULATE` itself unchanged):

```ts
populate: [...AUDIT_POPULATE, 'chatbot'],
```

In `account.service.ts` `mapList`, trim from the `toObject()` result (never touch entity getters, so unpopulated callers stay safe):

```ts
const obj = hasToObject(a) ? a.toObject() : a;
// A populated chatbot carries every column; only the summary travels. A
// soft-deleted one counts as no agent, same rule as
// findAccountsNotBelongingToAnyChatbot.
const chatbot = (obj as any).chatbot as
    | { id: string; name: string; deletedAt?: Date | null }
    | null
    | undefined;

return {
    ...obj,
    cookies: undefined,
    proxies: undefined,
    accessToken: undefined,
    chatbot:
        chatbot && !chatbot.deletedAt
            ? { id: chatbot.id, name: chatbot.name }
            : null,
} as unknown as AccountListResponseDto;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter api test -- test/modules/account/services/account.service.spec.ts test/modules/account/controllers/account.controller.spec.ts`
Expected: PASS.

- [ ] **Step 5: Regenerate the client**

Boot the API once so it rewrites `apps/api/swagger.json` (non-production does this on boot; if Postgres/Redis/env are missing, use the `local-setup` skill first), then stop it:

```bash
pnpm --filter api dev   # wait for the "Docs will serve" log line, then stop
pnpm generate:client
```

Verify: `grep -n "chatbot" packages/client/src/client/types.gen.ts` shows the new field inside `AccountListResponseDto`.

- [ ] **Step 6: Type-check and commit**

Run: `pnpm --filter api check-types`
Expected: no new errors.

```bash
git add apps/api/src/modules/account apps/api/test/modules/account packages/client
git commit -m "feat(api): expose each channel's agent in the account list"
```

---

### Task 2: The Agent column in the channels table

**Files:**
- Create: `apps/app/src/routes/accounts/accounts-list/components/account-list-table/account-chatbot-cell.tsx`
- Create: `apps/app/src/routes/accounts/accounts-list/components/account-list-table/account-chatbot-cell.test.tsx`
- Modify: `apps/app/src/routes/accounts/accounts-list/components/account-list-table/hooks/use-account-table-columns.tsx`

**Interfaces:**
- Consumes: `AccountListResponseDto.chatbot` (Task 1).
- Produces: `AccountChatbotCell({ chatbot }: { chatbot: AccountListResponseDto["chatbot"] })` — agent name linking to `/{workspaceSlug}/chatbot/{id}`, or a muted dash.

- [ ] **Step 1: Write the failing test**

`account-chatbot-cell.test.tsx` (test style follows `account-type-cell.test.tsx`):

```tsx
const renderCell = (chatbot: { id: string; name: string } | null) =>
  render(
    <MemoryRouter initialEntries={["/acme/accounts"]}>
      <Routes>
        <Route
          path="/:workspaceSlug/accounts"
          element={<AccountChatbotCell chatbot={chatbot} />}
        />
      </Routes>
    </MemoryRouter>,
  );

it("links the agent name to its detail page", () => {
  renderCell({ id: "bot-1", name: "Axios Bot" });
  expect(screen.getByRole("link", { name: "Axios Bot" })).toHaveAttribute(
    "href",
    "/acme/chatbot/bot-1",
  );
});

it("shows a muted dash when the channel has no agent", () => {
  renderCell(null);
  expect(screen.getByText("-")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter app test -- account-chatbot-cell`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the cell**

```tsx
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ROUTES } from "@/routes/constants";
import { Text } from "@medusajs/ui";
import type { AccountListResponseDto } from "@repo/client";
import { Link } from "react-router-dom";

type Props = { chatbot: AccountListResponseDto["chatbot"] };

/** Names the agent answering on a channel, linked to its detail page. */
export const AccountChatbotCell = ({ chatbot }: Props) => {
  const { workspaceSlug } = useWorkspaceParams();

  if (!chatbot) return <div className="text-ui-fg-muted">-</div>;

  return (
    <Link
      to={`/${workspaceSlug}/${ROUTES.Chatbot}/${chatbot.id}`}
      className="text-ui-fg-interactive hover:underline"
    >
      <Text size="small">{chatbot.name}</Text>
    </Link>
  );
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter app test -- account-chatbot-cell`
Expected: PASS.

- [ ] **Step 5: Wire the column**

In `use-account-table-columns.tsx`, insert between the `type` and `updatedAt` columns:

```tsx
columnHelper.display({
  id: "chatbot",
  header: () => headerLabel(t("chatbot.title")),
  cell: ({ row }) => <AccountChatbotCell chatbot={row.original.chatbot} />,
}),
```

- [ ] **Step 6: Commit**

```bash
git add apps/app/src/routes/accounts/accounts-list
git commit -m "feat(app): show the answering agent in the channels table"
```

---

### Task 3: Empty agent card on the channel page, with quick create

**Files:**
- Modify: `apps/app/src/routes/chatbot/chatbot-create/agent-builder/channel-accounts.ts`
- Modify: `apps/app/src/routes/chatbot/chatbot-create/agent-builder/components/channel-connect.tsx` (filter reuse only)
- Modify: `apps/app/src/routes/accounts/accounts-details/components/account-chatbot-section/account-chatbot-section.tsx`
- Modify: `apps/app/src/routes/accounts/accounts-details/account-details.tsx`
- Create: `apps/app/src/routes/accounts/accounts-details/components/account-chatbot-section/account-chatbot-section.test.tsx`
- Modify: `apps/app/src/i18n/translations/en.json`, `apps/app/src/i18n/translations/vi.json`

**Interfaces:**
- Produces: `isConnectableAccountType(type: AccountListResponseDto["type"]): boolean` in `channel-accounts.ts` (excludes `FACEBOOK_ACCOUNT`, `API_CHANNEL`); consumed again in Task 4.
- Produces: `AccountChatbotSection` takes `type` and links to `/{workspaceSlug}/chatbot/create?accountId={accountId}` when empty.

- [ ] **Step 1: Write the failing test**

`account-chatbot-section.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import "@/i18n";
import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ linked: false }));

vi.mock("@/hooks/api", () => ({
  useAccountChatbot: () => ({
    chatbot: state.linked ? { id: "bot-1" } : undefined,
    isLoading: false,
  }),
}));
vi.mock("@/components/chatbot/chatbot-section", () => ({
  ChatbotSection: ({ chatbotId }: { chatbotId: string }) => (
    <div data-testid="linked-agent">{chatbotId}</div>
  ),
}));

import { AccountChatbotSection } from "./account-chatbot-section";

const renderSection = (type: string) =>
  render(
    <MemoryRouter initialEntries={["/acme/accounts/acc-1"]}>
      <Routes>
        <Route
          path="/:workspaceSlug/accounts/:accountId"
          element={
            <AccountChatbotSection accountId="acc-1" type={type as never} />
          }
        />
      </Routes>
    </MemoryRouter>,
  );

describe("AccountChatbotSection", () => {
  it("offers a quick create that carries the channel into the builder", () => {
    renderSection("FACEBOOK_PAGE");

    expect(screen.getByText("No agent yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create agent" })).toHaveAttribute(
      "href",
      "/acme/chatbot/create?accountId=acc-1",
    );
  });

  it.each(["FACEBOOK_ACCOUNT", "API_CHANNEL"])(
    "renders nothing for %s, a channel the builder cannot connect",
    (type) => {
      renderSection(type);
      expect(screen.queryByText("No agent yet")).not.toBeInTheDocument();
    },
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter app test -- account-chatbot-section`
Expected: FAIL — component takes no `type` and renders nothing when empty.

- [ ] **Step 3: Add the connectable predicate and reuse it**

In `channel-accounts.ts` (below `channelOfAccountType`):

```ts
/** Channel kinds the builder never connects: user-level Facebook accounts
 * (only their pages are channels) and API channels (server integrations,
 * attached from the chatbot side). */
const UNCONNECTED_ACCOUNT_TYPES = new Set<AccountType>([
  "FACEBOOK_ACCOUNT",
  "API_CHANNEL",
]);

/** Whether the builder can connect this channel type to an agent. */
export const isConnectableAccountType = (type: AccountType) =>
  !UNCONNECTED_ACCOUNT_TYPES.has(type);
```

In `channel-connect.tsx`, replace the `existingChannelAccounts` filter body with `isConnectableAccountType(a.type)` (import it from `../channel-accounts`) and drop the now-stale inline comment; behavior is unchanged.

- [ ] **Step 4: Implement the empty card**

Add i18n keys (both locales, under `accounts.details`):

```json
"noChatbot": {
  "title": "No agent yet",
  "message": "Create an agent to answer customers on this channel.",
  "action": "Create agent"
}
```

```json
"noChatbot": {
  "title": "Chưa có agent",
  "message": "Tạo agent để trả lời khách hàng trên kênh này.",
  "action": "Tạo agent"
}
```

`account-chatbot-section.tsx` becomes:

```tsx
import { ChatbotSection } from "@/components/chatbot/chatbot-section";
import { useAccountChatbot } from "@/hooks/api";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { isConnectableAccountType } from "@/routes/chatbot/chatbot-create/agent-builder/channel-accounts";
import { ROUTES } from "@/routes/constants";
import { IconRobot } from "@tabler/icons-react";
import { Container, Divider, Heading } from "@medusajs/ui";
import type { AccountGetDetailResponseDto, ChatbotListResponseDto } from "@repo/client";
import { NoRecords } from "@repo/ui/common-components";
import { useTranslation } from "react-i18next";

type Props = {
  accountId: string;
  type: AccountGetDetailResponseDto["type"];
  initialData?: ChatbotListResponseDto[];
};

/**
 * Sidebar card naming the agent that answers on this account. With none
 * linked, every connectable channel type gets a quick create into the
 * builder; types the builder cannot connect render nothing.
 */
export const AccountChatbotSection = ({ accountId, type, initialData }: Props) => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const { chatbot, isLoading } = useAccountChatbot(accountId, { initialData });

  const linkedChatbotId = isLoading ? undefined : chatbot?.id;

  if (linkedChatbotId) {
    return <ChatbotSection chatbotId={linkedChatbotId} title={t("chatbot.title")} />;
  }

  if (isLoading || !isConnectableAccountType(type)) return null;

  return (
    <Container className="p-0">
      <div className="flex flex-col gap-y-1 p-6 py-4">
        <Heading>{t("chatbot.title")}</Heading>
      </div>
      <Divider variant="dashed" />
      <NoRecords
        size="small"
        icon={<IconRobot />}
        title={t("accounts.details.noChatbot.title")}
        message={t("accounts.details.noChatbot.message")}
        action={{
          to: `/${workspaceSlug}/${ROUTES.Chatbot}/create?accountId=${accountId}`,
          label: t("accounts.details.noChatbot.action"),
        }}
      />
    </Container>
  );
};
```

In `account-details.tsx`, pass the type: `<AccountChatbotSection accountId={account.id} type={account.type} />`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter app test -- account-chatbot-section channel-connect`
Expected: PASS (the channel-connect suite still passes after the filter reuse).

- [ ] **Step 6: Commit**

```bash
git add apps/app/src/routes/accounts apps/app/src/routes/chatbot/chatbot-create/agent-builder apps/app/src/i18n
git commit -m "feat(app): offer agent creation from an agent-less channel page"
```

---

### Task 4: Builder prefill and pre-connect from `?accountId=`

**Files:**
- Modify: `apps/app/src/routes/chatbot/chatbot-create/agent-builder/builder-state.ts`
- Modify: `apps/app/src/routes/chatbot/chatbot-create/agent-builder/builder-state.test.ts`
- Create: `apps/app/src/routes/chatbot/chatbot-create/agent-builder/use-prefill-channel.ts`
- Modify: `apps/app/src/routes/chatbot/chatbot-create/agent-builder/use-agent-builder.ts`
- Modify: `apps/app/src/routes/chatbot/chatbot-create/agent-builder/agent-builder.tsx`
- Modify: `apps/app/src/hooks/api/accounts.ts` (`useAccount` only)
- Modify: `apps/app/src/routes/chatbot/chatbot-create/agent-builder/agent-builder.test.tsx`
- Modify: `apps/app/src/i18n/translations/en.json`, `vi.json`

**Interfaces:**
- Consumes: `LinkedAccountRef` (`builder-state.ts`), `isConnectableAccountType` (Task 3).
- Produces: `usePrefillChannel(accountId: string, enabled: boolean): { ensure: () => Promise<LinkedAccountRef | undefined> }` — resolves once the account query settles; `undefined` for disabled/empty/non-connectable/failed. Fires `agentBuilder.ui.channelLoadFailed` toast once on failure.
- Produces: `useAgentBuilder({ hydrateFrom, ensurePrefillChannel })`; `BuilderAction` `"start"` gains `prefillBusinessName?: string`.
- Produces: once `state.chatbotId` exists, the prefill channel is linked through the existing endpoint; `linked`, then `skipped`, then error handling as in Review Focus.

- [ ] **Step 1: Write the failing reducer tests**

In `builder-state.test.ts`:

```ts
it("seeds an empty business name from the channel the owner came from", () => {
  const s = builderReducer(initialBuilderState, {
    type: "start",
    profile: createProfile("beauty", "en"),
    suggestion: null,
    source: "template",
    prefillBusinessName: "Axios English Center",
  });
  expect(s.profile!.businessName).toBe("Axios English Center");
});

it("never overwrites a business name already provided", () => {
  const profile = { ...createProfile("beauty", "en"), businessName: "Lotus Spa" };
  const s = builderReducer(initialBuilderState, {
    type: "start",
    profile,
    suggestion: null,
    source: "template",
    prefillBusinessName: "Axios English Center",
  });
  expect(s.profile!.businessName).toBe("Lotus Spa");
});
```

- [ ] **Step 2: Run reducer tests to verify they fail**

Run: `pnpm --filter app test -- builder-state`
Expected: FAIL — `prefillBusinessName` is not a known action field and the name stays empty.

- [ ] **Step 3: Implement the reducer seed**

In `builder-state.ts`, add `prefillBusinessName?: string` to the `"start"` action, and in the `"start"` case compute `profile` first, then:

```ts
// The channel the owner came from names the business unless an answer
// (a description) already provided one; remains unanswered, so the
// question still asks, prefilled.
const seeded =
  action.prefillBusinessName && !profile.businessName.trim()
    ? { ...profile, businessName: action.prefillBusinessName }
    : profile;
```

and use `seeded` in the returned state (keep the existing `chatbotId` / `linkedAccounts` carry-over and `answered`/`describeText` behavior).

- [ ] **Step 4: Write the failing builder tests**

In `agent-builder.test.tsx`: add `const prefillAccount = vi.fn();` to the mock state; add `useAccount: (...args: unknown[]) => prefillAccount(...args)` to the `@/hooks/api` mock; in `beforeEach`: `prefillAccount.mockReset().mockReturnValue({ account: undefined, isError: false });`. Then a new describe:

```tsx
describe("arriving from a channel page", () => {
  const renderFromChannel = () =>
    render(
      <MemoryRouter initialEntries={["/ws/chatbot/create?accountId=acc-1"]}>
        <AgentBuilder />
      </MemoryRouter>,
    );

  beforeEach(() => {
    prefillAccount.mockReturnValue({
      account: { id: "acc-1", type: "FACEBOOK_PAGE", name: "Axios English Center" },
      isError: false,
    });
  });

  it("prefills the business name and connects the channel to the draft", async () => {
    linkChatbotAccount.mockResolvedValue({ data: { data: { linked: ["acc-1"], skipped: [] } } });
    renderFromChannel();

    await pickBeautyTemplate();
    expect(
      screen.getByRole("textbox", { name: "agentBuilder.questions.businessName.title" }),
    ).toHaveValue("Axios English Center");

    await answerCurrent(); // businessName (keeps the prefilled value)
    await answerCurrent(); // agentName, creates the draft
    await waitFor(() => expect(linkChatbotAccount).toHaveBeenCalledWith({ accounts: ["acc-1"] }));
    await screen.findByText("agentBuilder.ui.connected");
    expect(screen.getByRole("button", { name: "agentBuilder.ui.unlinkChannel" })).toBeInTheDocument();
  });

  it("tells the owner when the channel already belongs to another agent", async () => {
    linkChatbotAccount.mockResolvedValue({
      data: { data: { linked: [], skipped: [{ id: "acc-1", name: "Axios English Center" }] } },
    });
    renderFromChannel();
    await pickBeautyTemplate();
    await answerCurrent();
    await answerCurrent();

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("agentBuilder.ui.channelInUse"));
    expect(screen.queryByText("agentBuilder.ui.connected")).not.toBeInTheDocument();
  });

  it("keeps going when the connect request fails", async () => {
    linkChatbotAccount.mockRejectedValue(new Error("down"));
    renderFromChannel();
    await pickBeautyTemplate();
    await answerCurrent();
    await answerCurrent();

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("agentBuilder.ui.connectFailed"));
  });

  it("starts without prefill when the channel cannot be loaded", async () => {
    prefillAccount.mockReturnValue({ account: undefined, isError: true });
    renderFromChannel();

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("agentBuilder.ui.channelLoadFailed"),
    );
    await pickBeautyTemplate();
    expect(
      screen.getByRole("textbox", { name: "agentBuilder.questions.businessName.title" }),
    ).toHaveValue("");
    await answerCurrent();
    await answerCurrent();
    expect(linkChatbotAccount).not.toHaveBeenCalled();
  });

  it("ignores a channel type the builder never connects", async () => {
    prefillAccount.mockReturnValue({
      account: { id: "acc-1", type: "FACEBOOK_ACCOUNT", name: "Owner Account" },
      isError: false,
    });
    renderFromChannel();
    await pickBeautyTemplate();
    expect(
      screen.getByRole("textbox", { name: "agentBuilder.questions.businessName.title" }),
    ).toHaveValue("");
    await answerCurrent();
    await answerCurrent();
    await waitFor(() => expect(create).toHaveBeenCalledOnce());
    expect(linkChatbotAccount).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 5: Run builder tests to verify they fail**

Run: `pnpm --filter app test -- agent-builder`
Expected: FAIL — `accountId` is ignored; `useAccount` is not on the mocked module yet.

- [ ] **Step 6: Implement `usePrefillChannel`**

New file `use-prefill-channel.ts`:

```ts
/** Resolves once the account query settles; one promise per mount. */
export function usePrefillChannel(accountId: string, enabled: boolean) {
  const { t } = useTranslation();
  const { account, isError } = useAccount(accountId, { enabled });
  const settle = useRef<((value: LinkedAccountRef | undefined) => void) | null>(null);
  const settled = useRef<Promise<LinkedAccountRef | undefined> | null>(null);
  const notified = useRef(false);

  if (enabled && !settled.current) {
    settled.current = new Promise((resolve) => { settle.current = resolve; });
  }

  useEffect(() => {
    if (!enabled || !settle.current) return;
    if (account) {
      settle.current(
        isConnectableAccountType(account.type)
          ? { id: account.id, type: account.type, name: account.name }
          : undefined,
      );
      settle.current = null;
    } else if (isError) {
      if (!notified.current) {
        notified.current = true;
        toast.error(t("agentBuilder.ui.channelLoadFailed"));
      }
      settle.current(undefined);
      settle.current = null;
    }
  }, [enabled, account, isError, t]);

  const ensure = useCallback(
    () => settled.current ?? Promise.resolve(undefined),
    [],
  );

  return { ensure };
}
```

Add the `agentBuilder.ui.channelLoadFailed` key to both locales:
`"Could not load this channel. You can connect it later."` / `"Không tải được kênh này. Bạn có thể liên kết sau."`.

- [ ] **Step 7: Wire `useAgentBuilder`**

Accept `ensurePrefillChannel?: () => Promise<LinkedAccountRef | undefined>`; make `startFromDescription` await it alongside the suggestion and pass `prefillBusinessName: channel?.name`; make `startFromTemplate` await it before dispatching.

Then the one-shot pre-connect effect (guarded so re-renders and restarts never relink):

```ts
const linkPrefill = useLinkChatbotAccount(state.chatbotId ?? "");
const prefillLinkStarted = useRef(false);

useEffect(() => {
  if (!state.chatbotId || !ensurePrefillChannel || prefillLinkStarted.current) return;
  prefillLinkStarted.current = true;
  void (async () => {
    const account = await ensurePrefillChannel();
    if (!account) return;
    try {
      const res = await linkPrefill.mutateAsync({ accounts: [account.id] });
      const result = (res.data as A)?.data as ChatbotLinkAccountResponseDto | undefined;
      if (result?.linked?.includes(account.id)) {
        dispatch({ type: "accountsLinked", accounts: [account] });
      } else {
        toast.error(t("agentBuilder.ui.channelInUse", { name: account.name }));
      }
    } catch {
      toast.error(t("agentBuilder.ui.connectFailed"));
    }
  })();
}, [state.chatbotId, ensurePrefillChannel, linkPrefill, t]);
```

- [ ] **Step 8: Wire `AgentBuilder` and the hook fix**

In `agent-builder.tsx`: read `accountId` from the params, call

```tsx
const prefill = usePrefillChannel(accountId, !!accountId && !hydrateId);
const builder = useAgentBuilder({
  hydrateFrom: hydrateId ? chatbot : undefined,
  ensurePrefillChannel: prefill.ensure,
});
```

In `hooks/api/accounts.ts` `useAccount`, change `account: data.data` to `account: data?.data` so a disabled query does not crash (mirrors `useChatbot`).

- [ ] **Step 9: Run tests to verify they pass**

Run: `pnpm --filter app test -- agent-builder builder-state`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add apps/app/src/routes/chatbot apps/app/src/hooks/api/accounts.ts apps/app/src/i18n
git commit -m "feat(app): prefill and pre-connect the agent builder from a channel"
```

---

### Task 5: Whole-branch verification

- [ ] **Step 1: Full test suites**

Run: `pnpm --filter app test`
Run: `pnpm --filter api test`
Expected: all PASS, including `channel-connect`, `agent-builder`, `builder-state`, `account.service`, `account.controller`.

- [ ] **Step 2: Type checks**

Run: `pnpm --filter api check-types`
Expected: no new errors. (`apps/app` `check-types` is a no-op — skip it.)

- [ ] **Step 3: Manual smoke (if the local stack is running)**

Run `pnpm dev`, then on a channel with no agent: the table shows an Agent column (dash), the channel page offers "Create agent", and the builder opens with the channel name prefilled and the channel connected once the draft exists.
