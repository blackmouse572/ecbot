import { TooltipProvider } from "@medusajs/ui";
import { render as rtlRender, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import "@/i18n";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ChatbotChannelsCell } from "./chatbot-channels-cell";

const render = (ui: ReactElement) =>
  rtlRender(
    <MemoryRouter initialEntries={["/acme"]}>
      <TooltipProvider>
        <Routes>
          <Route path="/:workspaceSlug" element={ui} />
        </Routes>
      </TooltipProvider>
    </MemoryRouter>,
  );

const account = (id: string, type: string, name = id) => ({ id, type, name });

describe("ChatbotChannelsCell", () => {
  it("shows one mark per account, so two pages of one platform show twice", () => {
    render(
      <ChatbotChannelsCell
        accounts={[
          account("1", "FACEBOOK_PAGE", "Lumi"),
          account("2", "FACEBOOK_PAGE", "Lumi Quận 3"),
          account("3", "INSTAGRAM_ACCOUNT", "@lumi"),
        ]}
      />,
    );

    expect(screen.getAllByRole("img")).toHaveLength(3);
    expect(screen.getByText("3 accounts")).toBeInTheDocument();
  });

  it("caps the stack at four marks and counts the rest", () => {
    render(
      <ChatbotChannelsCell
        accounts={["1", "2", "3", "4", "5", "6"].map((id) =>
          account(id, "FACEBOOK_PAGE"),
        )}
      />,
    );

    expect(screen.getAllByRole("img")).toHaveLength(4);
    expect(screen.getByText("+2")).toBeInTheDocument();
    expect(screen.getByText("6 accounts")).toBeInTheDocument();
  });

  it("links to the channels page when the agent has none", () => {
    render(<ChatbotChannelsCell accounts={[]} />);

    expect(
      screen.getByRole("link", {
        name: "Connect a channel to enable this agent",
      }),
    ).toHaveAttribute("href", "/acme/accounts");
  });
});
