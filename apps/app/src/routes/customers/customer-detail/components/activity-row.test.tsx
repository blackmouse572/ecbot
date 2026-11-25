import { render, screen } from "@testing-library/react";
import "@/i18n";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

// A Hoạt động line for each kind of marketing event, Zalo follows included.

vi.mock("@/hooks/use-workspace-params", () => ({
  useWorkspaceParams: () => ({ workspaceSlug: "acme" }),
}));

import { ActivityRow } from "./activity-row";

const marketing = (event: object) =>
  ({
    kind: "marketing",
    id: "e-1",
    at: "2026-11-20T08:00:00Z",
    event: {
      id: "e-1",
      oldValue: null,
      reason: null,
      actor: "SYSTEM",
      createdAt: "2026-11-20T08:00:00Z",
      ...event,
    },
  }) as A;

const renderRow = (item: A) =>
  render(
    <MemoryRouter>
      <ul>
        <ActivityRow item={item} />
      </ul>
    </MemoryRouter>,
  );

describe("ActivityRow", () => {
  it("shows a Zalo follow", () => {
    renderRow(marketing({ kind: "FOLLOW", newValue: "true" }));

    expect(screen.getByText("Followed the Zalo OA")).toBeInTheDocument();
  });

  it("shows a Zalo unfollow", () => {
    renderRow(marketing({ kind: "FOLLOW", newValue: "false" }));

    expect(screen.getByText("Unfollowed the Zalo OA")).toBeInTheDocument();
  });

  it("names the link a customer came through and opens its source", () => {
    renderRow(
      marketing({
        kind: "SOURCE",
        source: {
          sourceId: "s-2",
          sourceName: "Tờ rơi Tết",
          codeName: "KOL Minh Thư",
          channel: "FACEBOOK_PAGE",
          at: "2026-11-20T08:00:00Z",
        },
      }),
    );

    expect(
      screen.getByRole("link", {
        name: "Came through Tờ rơi Tết (KOL Minh Thư)",
      }),
    ).toHaveAttribute("href", "/acme/sources/s-2");
  });

  it("keeps the plain line when the link was deleted", () => {
    renderRow(marketing({ kind: "SOURCE", source: null }));

    expect(screen.getByText("Came through a source link")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("links an order to its page", () => {
    renderRow({
      kind: "order",
      id: "o-1",
      at: "2026-11-20T08:00:00Z",
      order: {
        id: "o-1",
        code: "DH-1",
        total: 250000,
        currency: "VND",
        status: "CONFIRMED",
        items: [],
      },
    });

    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/acme/orders/o-1",
    );
  });
});
