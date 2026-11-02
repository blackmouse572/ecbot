import { TooltipProvider } from "@medusajs/ui";
import {
  fireEvent,
  render as rtlRender,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import { MessageComposer } from "./message-composer";

const render = (ui: ReactElement) =>
  rtlRender(<TooltipProvider>{ui}</TooltipProvider>);

describe("MessageComposer", () => {
  it("lets the operator type while Meta's 24h window is open", () => {
    render(<MessageComposer isSending={false} onSubmit={vi.fn()} />);
    expect(screen.getByRole("textbox")).toBeEnabled();
    expect(
      screen.queryByText("conversations.composer.windowClosed"),
    ).not.toBeInTheDocument();
  });

  it("names the send button, not the message box, Send", () => {
    render(<MessageComposer isSending={false} onSubmit={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: "actions.send" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox")).not.toHaveAccessibleName(
      "actions.send",
    );
  });

  it("disables the input under an explanation once the window has closed", () => {
    render(
      <MessageComposer isSending={false} onSubmit={vi.fn()} windowClosed />,
    );
    expect(screen.getByRole("textbox", { hidden: true })).toBeDisabled();
    expect(
      screen.getByText("conversations.composer.windowClosed"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "conversations.reactions.policyLink" }),
    ).toHaveAttribute("href", expect.stringContaining("facebook.com"));
  });

  describe("attachments", () => {
    const MB = 1024 * 1024;
    const messenger = {
      image: { maxBytes: 5 * MB, types: ["image/jpeg", "image/png"] },
      file: { maxBytes: 10 * MB, types: ["application/pdf"] },
    };
    const png = (name: string, size = 10) => {
      const f = new File(["x"], name, { type: "image/png" });
      Object.defineProperty(f, "size", { value: size });
      return f;
    };

    beforeEach(() => {
      // jsdom has no object URLs; the input previews files with them.
      URL.createObjectURL = vi.fn(() => "blob:preview");
      URL.revokeObjectURL = vi.fn();
    });

    it("offers no attach buttons on a text-only channel", () => {
      render(<MessageComposer isSending={false} onSubmit={vi.fn()} />);
      expect(screen.queryByTestId("chat-attach-photos")).toBeNull();
      expect(screen.queryByTestId("chat-attach-file")).toBeNull();
    });

    it("offers only what the channel takes", () => {
      render(
        <MessageComposer
          isSending={false}
          onSubmit={vi.fn()}
          uploads={{ image: messenger.image }}
        />,
      );
      expect(screen.getByTestId("chat-attach-photos")).toBeInTheDocument();
      expect(screen.queryByTestId("chat-attach-file")).toBeNull();
      expect(screen.getByTestId("chat-photos-input")).toHaveAttribute(
        "accept",
        "image/jpeg,image/png",
      );
    });

    it("refuses a photo over the channel's size before it is attached", async () => {
      render(
        <MessageComposer
          isSending={false}
          onSubmit={vi.fn()}
          uploads={{ image: { maxBytes: 1_000_000, types: ["image/png"] } }}
        />,
      );
      fireEvent.change(screen.getByTestId("chat-photos-input"), {
        target: { files: [png("big.png", 2 * MB), png("small.png")] },
      });

      expect(await screen.findByText("small.png")).toBeInTheDocument();
      expect(screen.queryByText("big.png")).toBeNull();
    });

    it("sends the photos with the text", async () => {
      const onSubmit = vi.fn();
      render(
        <MessageComposer
          isSending={false}
          onSubmit={onSubmit}
          uploads={messenger}
        />,
      );
      fireEvent.change(screen.getByTestId("chat-photos-input"), {
        target: { files: [png("shirt.png")] },
      });
      await screen.findByText("shirt.png");

      fireEvent.submit(screen.getByRole("textbox").closest("form")!);

      await waitFor(() =>
        expect(onSubmit).toHaveBeenCalledWith("", [
          expect.objectContaining({
            mediaType: "image/png",
            filename: "shirt.png",
          }),
        ]),
      );
    });
  });
});
