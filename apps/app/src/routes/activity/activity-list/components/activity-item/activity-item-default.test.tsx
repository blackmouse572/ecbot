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
});
