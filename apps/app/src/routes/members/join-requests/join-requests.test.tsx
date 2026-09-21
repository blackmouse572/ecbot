import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const approveMutateAsync = vi.fn();

vi.mock("@/hooks/api/join-requests", () => ({
  useJoinRequests: vi.fn(),
  useApproveJoinRequest: vi.fn(() => ({ mutateAsync: approveMutateAsync })),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@medusajs/ui", async () => {
  const actual =
    await vi.importActual<typeof import("@medusajs/ui")>("@medusajs/ui");
  return {
    ...actual,
    toast: { promise: vi.fn(), success: vi.fn(), error: vi.fn() },
  };
});

import { useJoinRequests } from "@/hooks/api/join-requests";
import { JoinRequests } from "./join-requests";

const request = {
  id: "r1",
  reason: "I want to help support customers",
  status: "PENDING",
  createdAt: "2026-01-01T00:00:00.000Z",
  requestFrom: { id: "u1", name: "Alice", email: "alice@mail.com" },
};

describe("Join requests page", () => {
  it("renders the requester and the reason", () => {
    vi.mocked(useJoinRequests).mockReturnValue({
      joinRequests: [request],
      isLoading: false,
    } as A);

    render(<JoinRequests />);

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("alice@mail.com")).toBeInTheDocument();
    expect(
      screen.getByText("I want to help support customers"),
    ).toBeInTheDocument();
  });

  it("approves a request when the approve button is clicked", async () => {
    vi.mocked(useJoinRequests).mockReturnValue({
      joinRequests: [request],
      isLoading: false,
    } as A);

    render(<JoinRequests />);
    await userEvent.click(
      screen.getByRole("button", {
        name: "members.joinRequests.approve.action",
      }),
    );

    expect(approveMutateAsync).toHaveBeenCalledWith("r1");
  });

  it("renders empty state when there are no join requests", () => {
    vi.mocked(useJoinRequests).mockReturnValue({
      joinRequests: [],
      isLoading: false,
    } as A);

    render(<JoinRequests />);

    expect(screen.getByText("members.joinRequests.empty")).toBeInTheDocument();
  });
});
