import "@/i18n";
import i18n from "@/i18n";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  invitations: [] as unknown[],
  accepted: [] as string[],
  declined: [] as string[],
  navigated: [] as string[],
}));
const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));

vi.mock("@/hooks/api/workspace-member", () => ({
  useMyInvitations: () => ({ invitations: state.invitations }),
  useAcceptMyInvitation: () => ({
    isPending: false,
    mutateAsync: async (id: string) => {
      state.accepted.push(id);
      return {
        workspace: { id: "ws-1", name: "Mộc Café", slug: "moc" },
        roleName: "Sales",
      };
    },
  }),
  useDeclineMyInvitation: () => ({
    isPending: false,
    mutateAsync: async (id: string) => {
      state.declined.push(id);
    },
  }),
}));
vi.mock("@medusajs/ui", async () => {
  const actual =
    await vi.importActual<typeof import("@medusajs/ui")>("@medusajs/ui");
  return { ...actual, toast };
});
vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom",
    );
  return {
    ...actual,
    useNavigate: () => (to: string) => state.navigated.push(to),
  };
});

import { OnboardInvitations } from "./onboard-invitations";

const invitation = (id: string, roleName: string) => ({
  id,
  workspace: { id: `ws-${id}`, name: "Mộc Café", slug: "moc" },
  inviterName: "Lan",
  roleName,
  expiresAt: "2026-11-15T00:00:00.000Z",
});

const renderCards = () =>
  render(
    <MemoryRouter>
      <OnboardInvitations />
    </MemoryRouter>,
  );

describe("OnboardInvitations", () => {
  beforeEach(() => {
    state.invitations = [];
    state.accepted = [];
    state.declined = [];
    state.navigated = [];
    toast.success.mockReset();
  });
  afterEach(() => i18n.changeLanguage("en"));

  it("renders nothing without invitations", () => {
    const { container } = renderCards();
    expect(container.textContent).toBe("");
  });

  it("shows one card per invitation, with the role (Member translated)", () => {
    state.invitations = [invitation("1", "Member"), invitation("2", "Sales")];
    renderCards();

    expect(
      screen.getByText("Lan invited you to Mộc Café as Member"),
    ).toBeTruthy();
    expect(
      screen.getByText("Lan invited you to Mộc Café as Sales"),
    ).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Accept" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Decline" })).toHaveLength(2);
  });

  it("Accept joins and lands on that workspace's dashboard", async () => {
    state.invitations = [invitation("1", "Sales")];
    renderCards();

    fireEvent.click(screen.getByRole("button", { name: "Accept" }));

    await waitFor(() => expect(state.navigated).toEqual(["/moc/dashboard"]));
    expect(state.accepted).toEqual(["1"]);
    expect(toast.success).toHaveBeenCalledWith("You joined Mộc Café as Sales");
  });

  it("Decline declines that invitation only", async () => {
    state.invitations = [invitation("1", "Member")];
    renderCards();

    fireEvent.click(screen.getByRole("button", { name: "Decline" }));

    await waitFor(() => expect(state.declined).toEqual(["1"]));
    expect(state.navigated).toEqual([]);
  });

  it("reads naturally in Vietnamese", async () => {
    await i18n.changeLanguage("vi");
    state.invitations = [invitation("1", "Member")];
    renderCards();

    expect(
      screen.getByText("Lan đã mời bạn vào Mộc Café với vai trò Thành viên"),
    ).toBeTruthy();
  });
});
