import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const owner = vi.hoisted(() => ({ isOwner: true }));
vi.mock("@/hooks/use-is-workspace-owner", () => ({
  useIsWorkspaceOwner: () => owner.isOwner,
}));

const approveMutateAsync = vi.fn();

vi.mock("@/hooks/api/join-requests", () => ({
  useJoinRequests: vi.fn(),
  useApproveJoinRequest: vi.fn(() => ({ mutateAsync: approveMutateAsync })),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
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

const apiError = (status: number, statusCode: number) => ({
  response: { status, data: { statusCode } },
});

describe("Join requests page", () => {
  beforeEach(() => {
    owner.isOwner = true;
  });

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
    expect(
      screen.getByText("members.joinRequests.emptyTitle"),
    ).toBeInTheDocument();
  });

  it("throws instead of showing the empty state when loading fails", () => {
    const error = new Error("boom");
    vi.mocked(useJoinRequests).mockReturnValue({
      joinRequests: [],
      isLoading: false,
      isError: true,
      error,
    } as A);
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<JoinRequests />)).toThrow(error);
  });

  it("tells a member they can't view join requests, without asking the API", () => {
    owner.isOwner = false;
    vi.mocked(useJoinRequests).mockReturnValue({
      joinRequests: undefined,
      isLoading: false,
    } as A);

    render(<JoinRequests />);

    expect(
      screen.getByText("members.joinRequests.noReadPermission"),
    ).toBeInTheDocument();
    expect(vi.mocked(useJoinRequests).mock.lastCall?.[0]).toEqual({
      enabled: false,
    });
  });

  it.each([
    ["the owner guard's 400 5208", apiError(400, 5208)],
    ["a 403", apiError(403, 5100)],
  ])("shows the no-permission message on %s", (_, error) => {
    vi.mocked(useJoinRequests).mockReturnValue({
      joinRequests: undefined,
      isLoading: false,
      isError: true,
      error,
    } as A);

    render(<JoinRequests />);

    expect(
      screen.getByText("members.joinRequests.noReadPermission"),
    ).toBeInTheDocument();
  });

  it("still throws a suspended workspace's 403 to the error boundary", () => {
    vi.mocked(useJoinRequests).mockReturnValue({
      joinRequests: undefined,
      isLoading: false,
      isError: true,
      error: apiError(403, 5215),
    } as A);
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<JoinRequests />)).toThrow();
  });
});
