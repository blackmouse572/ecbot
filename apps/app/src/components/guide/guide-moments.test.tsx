import "@/i18n";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const data = vi.hoisted(() => ({ active: 0, conversations: 0, ws: "ws1" }));
const query = (count: number) => ({ count, isLoading: false, isError: false });

vi.mock("@/hooks/api/chatbot", () => ({
  useChatbots: () => query(data.active),
}));
vi.mock("@/hooks/api/conversations", () => ({
  useConversations: () => query(data.conversations),
}));
vi.mock("@/hooks/api/workspace", () => ({
  useWorkspace: () => ({ workspace: { id: data.ws, slug: "kunmart" } }),
}));
vi.mock("@/hooks/use-workspace-params", () => ({
  useWorkspaceParams: () => ({ workspaceSlug: "kunmart" }),
}));
vi.mock("@repo/auth", () => ({
  Can: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@medusajs/ui", async (original) => ({
  ...(await original<typeof import("@medusajs/ui")>()),
  toast: { info: vi.fn() },
}));

import { GuideMoments } from "./guide-moments";

const renderAt = (path = "/kunmart/dashboard") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <GuideMoments />
    </MemoryRouter>,
  );

describe("GuideMoments", () => {
  beforeEach(() => {
    localStorage.clear();
    data.active = 0;
    data.conversations = 1;
    data.ws = "ws1";
  });

  it("does not carry an open tour into another workspace", () => {
    localStorage.setItem("ecbot.guide.tour.ws1", "pending");
    data.active = 1;
    const view = renderAt();
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    data.ws = "ws2";
    view.rerender(
      <MemoryRouter initialEntries={["/kunmart/dashboard"]}>
        <GuideMoments />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(localStorage.getItem("ecbot.guide.tour.ws2")).toBeNull();
  });

  it("never tours a workspace that already had an active agent", () => {
    data.active = 1;
    renderAt();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("tours once after the first agent goes live", () => {
    const view = renderAt();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    data.active = 1;
    view.rerender(
      <MemoryRouter initialEntries={["/kunmart/dashboard"]}>
        <GuideMoments />
      </MemoryRouter>,
    );
    expect(screen.getByRole("dialog")).toHaveTextContent(
      "Customer messages land here",
    );
    expect(
      screen.queryByRole("button", { name: "Go Back" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("dialog")).toHaveTextContent(
      "Teach the agent about your shop",
    );
    fireEvent.click(screen.getByRole("button", { name: "Go Back" }));
    expect(screen.getByRole("dialog")).toHaveTextContent(
      "Customer messages land here",
    );
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    view.unmount();
    renderAt();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("waits for the menu to open on a folded sidebar", async () => {
    const visible = <T extends HTMLElement>(el: T) => {
      el.getBoundingClientRect = () => new DOMRect(0, 0, 28, 28);
      return el;
    };
    const menu = visible(document.createElement("button"));
    menu.setAttribute("data-sidebar-toggle", "");
    document.body.append(menu);
    localStorage.setItem("ecbot.guide.tour.ws1", "pending");
    data.active = 1;
    renderAt();

    expect(screen.getByRole("dialog")).toHaveTextContent(
      "Open the menu to start",
    );
    expect(
      screen.queryByRole("button", { name: "Next" }),
    ).not.toBeInTheDocument();

    const aside = document.createElement("aside");
    for (const route of ["conversations", "knowledge-base", "tools"]) {
      const link = visible(document.createElement("a"));
      link.href = `/kunmart/${route}`;
      aside.append(link);
    }
    menu.addEventListener("click", () => document.body.append(aside));
    fireEvent.click(menu);

    expect(
      await screen.findByText("Customer messages land here"),
    ).toBeInTheDocument();
    menu.remove();
    aside.remove();
  });

  it("waits while the builder is open over the page", () => {
    localStorage.setItem("ecbot.guide.tour.ws1", "pending");
    data.active = 1;
    renderAt("/kunmart/chatbot/create");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes the tour on Escape", () => {
    localStorage.setItem("ecbot.guide.tour.ws1", "pending");
    data.active = 1;
    renderAt();

    act(() => {
      fireEvent.keyUp(window, { key: "Escape" });
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(localStorage.getItem("ecbot.guide.tour.ws1")).toBe("done");
  });

  it("celebrates the first conversation and links to it", () => {
    localStorage.setItem("ecbot.guide.firstConversation.ws1", "pending");
    data.active = 1;
    localStorage.setItem("ecbot.guide.tour.ws1", "done");
    renderAt();

    expect(
      screen.getByRole("dialog", { name: "Your first conversation is here!" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("confetti")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "See conversation" }),
    ).toHaveAttribute("href", "/kunmart/conversations");

    fireEvent.click(screen.getByRole("button", { name: "Later" }));
    expect(localStorage.getItem("ecbot.guide.firstConversation.ws1")).toBe(
      "done",
    );
  });
});
