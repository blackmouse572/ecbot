import "@/i18n";
import { TooltipProvider } from "@medusajs/ui";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AIChatCard } from "./ai-chat-card";
import { AIChatInput } from "./ai-chat-input";
import type { ChatTransportConfig } from "./use-ai-chat-stream";

const sendMessage = vi.hoisted(() => vi.fn());

vi.mock("./use-ai-chat-stream", async () => ({
  ...(await vi.importActual<typeof import("./use-ai-chat-stream")>(
    "./use-ai-chat-stream",
  )),
  useAiChat: () => ({
    messages: [],
    status: "ready",
    error: undefined,
    sendMessage,
    stop: vi.fn(),
    setMessages: vi.fn(),
  }),
}));

const textOnly: ChatTransportConfig = {
  path: "/stream",
  includeCredentials: false,
  invalidateToolInvocations: false,
};

function renderChat(transport: ChatTransportConfig) {
  return render(
    <TooltipProvider>
      <AIChatCard
        chatbotId="bot-1"
        transport={transport}
        renderInput={<AIChatInput />}
      />
    </TooltipProvider>,
  );
}

function fileInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error("no file input");
  return input;
}

describe("AIChatInput attachments", () => {
  beforeEach(() => {
    sendMessage.mockReset();
    // jsdom has no object URLs; the input previews files with them.
    URL.createObjectURL = vi.fn(() => "blob:preview");
    URL.revokeObjectURL = vi.fn();
    // Nor can it fetch a blob or data URL back into bytes.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        blob: async () => new Blob(["x"], { type: "image/png" }),
      })),
    );
  });

  it("offers no attach button where the chat takes text only", () => {
    renderChat(textOnly);
    expect(screen.queryByTestId("chat-attach")).not.toBeInTheDocument();
  });

  it("uploads an attached photo, then sends it with its stored key", async () => {
    const upload = vi.fn(async (file: File) => ({
      type: "image",
      key: `preview-media/bot-1/${file.name}`,
      name: file.name,
    }));
    const { container } = renderChat({ ...textOnly, upload });
    expect(screen.getByTestId("chat-attach")).toBeInTheDocument();

    const photo = new File(["x"], "shirt.png", { type: "image/png" });
    fireEvent.change(fileInput(container), { target: { files: [photo] } });
    expect(await screen.findByText("shirt.png")).toBeInTheDocument();

    fireEvent.submit(screen.getByTestId("chat-input").closest("form")!);

    await waitFor(() => expect(sendMessage).toHaveBeenCalled());
    expect(upload).toHaveBeenCalledWith(expect.any(File));
    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "",
        files: [expect.objectContaining({ mediaType: "image/png" })],
        metadata: {
          attachments: [
            {
              type: "image",
              key: "preview-media/bot-1/shirt.png",
              name: "shirt.png",
            },
          ],
        },
      }),
    );
  });

  it("keeps the files and sends nothing when the upload fails", async () => {
    const upload = vi.fn(async () => {
      throw new Error("down");
    });
    const { container } = renderChat({ ...textOnly, upload });
    const photo = new File(["x"], "shirt.png", { type: "image/png" });
    fireEvent.change(fileInput(container), { target: { files: [photo] } });
    await screen.findByText("shirt.png");

    fireEvent.submit(screen.getByTestId("chat-input").closest("form")!);

    await waitFor(() => expect(upload).toHaveBeenCalled());
    expect(sendMessage).not.toHaveBeenCalled();
    expect(screen.getByText("shirt.png")).toBeInTheDocument();
  });

  it("keeps one file and drops a second", async () => {
    const upload = vi.fn();
    const { container } = renderChat({ ...textOnly, upload });
    const a = new File(["x"], "a.pdf", { type: "application/pdf" });
    const b = new File(["x"], "b.pdf", { type: "application/pdf" });
    fireEvent.change(fileInput(container), { target: { files: [a, b] } });

    expect(await screen.findByText("a.pdf")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByText("b.pdf")).not.toBeInTheDocument(),
    );
  });
});
