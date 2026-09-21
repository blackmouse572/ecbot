import { TooltipProvider } from "@medusajs/ui";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The @repo/ui components (Popover-driven EmojiPicker etc.) omit `import
// React` and rely on the app's Vite React plugin (automatic JSX runtime),
// which the standalone vitest config doesn't load — expose React globally
// so their classic-runtime JSX (`React.createElement`) resolves.
globalThis.React = React;

// `frimousse` fetches its emoji dataset from a CDN, which is unusable in
// jsdom — stub the pieces `EmojiPicker` (packages/ui) renders.
vi.mock("frimousse", () => ({
  EmojiPicker: {
    Root: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
    Search: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
      <input {...props} />
    ),
    Viewport: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
    Loading: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
    Empty: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
    List: () => <div data-testid="emoji-list" />,
  },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import { MessageBubble } from "./message-bubble";

const baseMessage = {
  id: "msg-1",
  direction: "INBOUND" as const,
  authorType: "USER" as const,
  authorId: "user-1",
  text: "hello",
  dateSent: "2026-01-01T00:00:00Z",
  createdAt: "2026-01-01T00:00:00Z",
};

describe("MessageBubble reactions", () => {
  beforeEach(() => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    // Radix Popover relies on pointer capture APIs jsdom doesn't implement.
    window.HTMLElement.prototype.hasPointerCapture = vi
      .fn()
      .mockReturnValue(false);
    window.HTMLElement.prototype.releasePointerCapture = vi.fn();
    window.HTMLElement.prototype.setPointerCapture = vi.fn();
    window.IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    } as unknown as typeof IntersectionObserver;
    // Base UI's Popover positions with floating-ui, which observes the anchor.
    window.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  });

  it("renders reaction chips grouped by emoji with counts, highlighting the operator's own reaction", () => {
    render(
      <MessageBubble
        message={
          {
            ...baseMessage,
            reactions: [
              {
                emoji: "👍",
                actorType: "customer",
                actorId: "cust-1",
                at: "2026-01-01T00:00:01Z",
              },
              {
                emoji: "👍",
                actorType: "operator",
                actorId: "op-1",
                at: "2026-01-01T00:00:02Z",
              },
              {
                emoji: "⭐",
                actorType: "customer",
                actorId: "cust-1",
                at: "2026-01-01T00:00:03Z",
              },
            ],
          } as A
        }
        currentOperatorId="op-1"
      />,
    );

    // Grouped by emoji: 👍 has count 2, ⭐ has count 1.
    const thumbsChip = screen.getByText("👍").closest("button");
    expect(thumbsChip).not.toBeNull();
    expect(thumbsChip).toHaveTextContent("2");
    expect(thumbsChip).toHaveClass("bg-ui-bg-interactive");

    const starChip = screen.getByText("⭐").closest("button");
    expect(starChip).not.toBeNull();
    expect(starChip).toHaveTextContent("1");
    expect(starChip).not.toHaveClass("bg-ui-bg-interactive");
  });

  it("toggles the operator's reaction to unreact when clicking a chip they're part of", async () => {
    const onReact = vi.fn();
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    render(
      <MessageBubble
        message={
          {
            ...baseMessage,
            reactions: [
              {
                emoji: "👍",
                actorType: "operator",
                actorId: "op-1",
                at: "2026-01-01T00:00:01Z",
              },
            ],
          } as A
        }
        currentOperatorId="op-1"
        onReact={onReact}
      />,
    );

    const thumbsChip = screen.getByText("👍").closest("button")!;
    await user.click(thumbsChip);

    expect(onReact).toHaveBeenCalledWith("msg-1", "👍", "unreact");
  });

  it("opens the quick-react popup from the trigger, and reacting calls onReact", async () => {
    const onReact = vi.fn();
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    render(
      <MessageBubble
        message={{ ...baseMessage, reactions: [] } as A}
        currentOperatorId="op-1"
        canReact
        onReact={onReact}
      />,
    );

    // Quick reactions live inside the popup, so they only exist once it's open.
    expect(screen.queryByText("😁")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "conversations.reactions.addReaction",
      }),
    );

    const quickReact = screen.getByText("😁").closest("button")!;
    await user.click(quickReact);

    expect(onReact).toHaveBeenCalledWith("msg-1", "😁", "react");
  });

  it("opens the full emoji picker from the plus button nested in the quick-react popup", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    render(
      <MessageBubble
        message={{ ...baseMessage, reactions: [] } as A}
        currentOperatorId="op-1"
        canReact
        onReact={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "conversations.reactions.addReaction",
      }),
    );
    expect(
      screen.queryByPlaceholderText("general.emojiSearch"),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "conversations.reactions.more" }),
    );

    expect(
      screen.getByPlaceholderText("general.emojiSearch"),
    ).toBeInTheDocument();
  });

  it("shows a disabled, policy-blocked affordance (no picker) when the reaction window is closed", async () => {
    const onReact = vi.fn();
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    render(
      <TooltipProvider>
        <MessageBubble
          message={{ ...baseMessage, reactions: [] } as A}
          currentOperatorId="op-1"
          canReact
          reactionWindowClosed
          onReact={onReact}
        />
      </TooltipProvider>,
    );

    // The interactive picker trigger is not offered...
    expect(
      screen.queryByRole("button", {
        name: "conversations.reactions.addReaction",
      }),
    ).not.toBeInTheDocument();

    // ...instead a disabled affordance is shown, and clicking it does nothing.
    const blocked = screen.getByRole("button", {
      name: "conversations.reactions.windowClosed",
    });
    await user.click(blocked);
    expect(onReact).not.toHaveBeenCalled();
  });

  it("does not render the react affordance when canReact is false", () => {
    render(
      <MessageBubble
        message={{ ...baseMessage, reactions: [] } as A}
        currentOperatorId="op-1"
        canReact={false}
        onReact={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("button", {
        name: "conversations.reactions.addReaction",
      }),
    ).not.toBeInTheDocument();
  });
});
