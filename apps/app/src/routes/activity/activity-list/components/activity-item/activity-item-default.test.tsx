import i18n from "@/i18n";
import type { ActivityListResponseDto } from "@repo/client";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/api", () => ({ useMe: () => ({ user: { id: "me" } }) }));

vi.mock("@/hooks/use-workspace-params", () => ({
  useWorkspaceParams: () => ({ workspaceSlug: "kunmart" }),
}));

import { ActivityItemDefault } from "./activity-item-default";

const activity = (
  subject: string,
  action: string,
  metadata: Record<string, unknown>,
) =>
  ({
    id: "a1",
    subject,
    action,
    metadata,
    by: { id: "u1", name: "Lan", email: "lan@example.com" },
    createdAt: new Date("2026-09-29T10:00:00Z").toISOString(),
  }) as unknown as ActivityListResponseDto;

const renderItem = (item: ActivityListResponseDto) =>
  render(
    <MemoryRouter>
      <ActivityItemDefault item={item} />
    </MemoryRouter>,
  ).container.textContent;

describe("ActivityItemDefault", () => {
  it("names the workspace that was created", () => {
    expect(
      renderItem(
        activity("WORKSPACE", "create", { id: "w1", name: "Kunmart" }),
      ),
    ).toContain("Lan\u00a0created workspace Kunmart");
  });

  it("says You, translated, for the signed-in user's own activity", async () => {
    const item = activity("WORKSPACE", "create", { id: "w1", name: "Kunmart" });
    (item as { by: { id: string } }).by.id = "me";
    expect(renderItem(item)).toContain("You\u00a0created workspace Kunmart");

    await i18n.changeLanguage("vi");
    expect(renderItem(item)).toContain(
      "Bạn\u00a0đã tạo không gian làm việc Kunmart",
    );
    await i18n.changeLanguage("en");
  });

  it("names the object in the generic create message", () => {
    expect(
      renderItem(activity("CUSTOMER_TAG", "create", { id: "t1", name: "VIP" })),
    ).toContain("created VIP");
  });

  it("names the object in the generic delete message", () => {
    expect(
      renderItem(activity("CUSTOMER_TAG", "delete", { id: "t1", name: "VIP" })),
    ).toContain("deleted VIP");
  });

  // The audit log keeps only the invitation id, never the invitee email.
  it("says an invitation was sent, with no blank name", async () => {
    const item = activity("INVITATION", "invite_member", { id: "i1" });
    expect(renderItem(item)).toContain(
      "Lan\u00a0sent an invitation to join the workspace",
    );

    await i18n.changeLanguage("vi");
    expect(renderItem(item)).toContain(
      "Lan\u00a0đã gửi lời mời tham gia không gian làm việc",
    );
    await i18n.changeLanguage("en");
  });

  it("names the workspace a member joined", () => {
    expect(
      renderItem(
        activity("WORKSPACE", "join_workspace", { id: "w1", name: "Kunmart" }),
      ),
    ).toContain("joined workspace Kunmart");
  });

  it("names the customer a message was sent to, linked to the conversation", async () => {
    const item = activity("CONVERSATION", "create", {
      id: "c1",
      name: "Lan Nguyen",
    });
    const { container } = render(
      <MemoryRouter>
        <ActivityItemDefault item={item} />
      </MemoryRouter>,
    );
    expect(container.textContent).toContain("sent a message to Lan Nguyen");
    expect(
      container.querySelector('a[href="/kunmart/conversations/c1"]'),
    ).not.toBeNull();

    await i18n.changeLanguage("vi");
    expect(renderItem(item)).toContain("đã gửi tin nhắn cho Lan Nguyen");
    await i18n.changeLanguage("en");
  });

  it("names the customer of an updated conversation", () => {
    expect(
      renderItem(
        activity("CONVERSATION", "update", { id: "c1", name: "Lan Nguyen" }),
      ),
    ).toContain("updated the conversation with Lan Nguyen");
  });

  it.each([
    ["no name", {}],
    ["a raw sender id", { name: "32b908a2-d449-49dc-a1f2-205fdc5abee2" }],
    ["a numeric platform id", { name: "24536128911234567" }],
  ])("says a customer instead of %s", (_, metadata) => {
    const text = renderItem(
      activity("CONVERSATION", "create", { id: "c1", ...metadata }),
    );
    expect(text).toContain("sent a message to a customer");
  });

  it("keeps a phone number used as the customer name", () => {
    expect(
      renderItem(
        activity("CONVERSATION", "create", { id: "c1", name: "84912345678" }),
      ),
    ).toContain("sent a message to 84912345678");
  });

  it.each([
    ["subscription_change_plan", "Changed the subscription plan"],
    ["subscription_cancel", "Cancelled the subscription"],
    ["subscription_resume", "Resumed the subscription"],
  ])("labels a PLAN %s activity", (action, message) => {
    expect(renderItem(activity("PLAN", action, {}))).toContain(message);
  });

  it("labels a PLAN plan change in vi", async () => {
    await i18n.changeLanguage("vi");
    expect(
      renderItem(activity("PLAN", "subscription_change_plan", {})),
    ).toContain("đã thay đổi gói đăng ký");
    await i18n.changeLanguage("en");
  });

  it.each([
    ["conversation_takeover", "took over the conversation with Lan Nguyen"],
    ["conversation_bot_resumed", "handed Lan Nguyen back to the bot"],
    ["conversation_resolved", "resolved the conversation with Lan Nguyen"],
    ["conversation_reopened", "reopened the conversation with Lan Nguyen"],
  ])("labels a CONVERSATION %s activity", (action, message) => {
    expect(
      renderItem(
        activity("CONVERSATION", action, { id: "c1", name: "Lan Nguyen" }),
      ),
    ).toContain(message);
  });

  it("names the bot for a handoff it raised", async () => {
    const item = {
      ...activity("CONVERSATION", "conversation_handoff", {
        id: "c1",
        name: "Lan Nguyen",
        reason: "tag_trigger",
      }),
      by: null,
    } as unknown as ActivityListResponseDto;
    expect(renderItem(item)).toContain(
      "Bot\u00a0handed Lan Nguyen over to the team",
    );

    await i18n.changeLanguage("vi");
    expect(renderItem(item)).toContain(
      "Bot\u00a0đã chuyển Lan Nguyen cho nhân viên",
    );
    await i18n.changeLanguage("en");
  });
});
