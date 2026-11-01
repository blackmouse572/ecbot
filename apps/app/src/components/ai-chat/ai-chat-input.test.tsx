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

const photosInput = () => screen.getByTestId("chat-photos-input");
const fileInput = () => screen.getByTestId("chat-file-input");
const pick = (input: HTMLElement, ...files: File[]) =>
  fireEvent.change(input, { target: { files } });
const pdf = (name: string) =>
  new File(["x"], name, { type: "application/pdf" });
const png = (name: string) => new File(["x"], name, { type: "image/png" });

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

  it("offers no attach buttons where the chat takes text only", () => {
    renderChat(textOnly);
    expect(screen.queryByTestId("chat-attach-photos")).not.toBeInTheDocument();
    expect(screen.queryByTestId("chat-attach-file")).not.toBeInTheDocument();
  });

  it("uploads an attached photo, then sends it with its stored key", async () => {
    const upload = vi.fn(async (file: File) => ({
      type: "image",
      key: `preview-media/bot-1/${file.name}`,
      name: file.name,
    }));
    renderChat({ ...textOnly, upload });
    expect(screen.getByTestId("chat-attach-photos")).toBeInTheDocument();
    expect(screen.getByTestId("chat-attach-file")).toBeInTheDocument();

    pick(photosInput(), png("shirt.png"));
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
    renderChat({ ...textOnly, upload });
    pick(photosInput(), png("shirt.png"));
    await screen.findByText("shirt.png");

    fireEvent.submit(screen.getByTestId("chat-input").closest("form")!);

    await waitFor(() => expect(upload).toHaveBeenCalled());
    expect(sendMessage).not.toHaveBeenCalled();
    expect(screen.getByText("shirt.png")).toBeInTheDocument();
  });

  it("keeps several photos together", async () => {
    renderChat({ ...textOnly, upload: vi.fn() });
    pick(photosInput(), png("a.png"), png("b.png"));

    expect(await screen.findByText("a.png")).toBeInTheDocument();
    expect(screen.getByText("b.png")).toBeInTheDocument();
  });

  it("lets a file replace the photos", async () => {
    renderChat({ ...textOnly, upload: vi.fn() });
    pick(photosInput(), png("a.png"), png("b.png"));
    await screen.findByText("a.png");

    pick(fileInput(), pdf("menu.pdf"));

    expect(await screen.findByText("menu.pdf")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByText("a.png")).not.toBeInTheDocument(),
    );
    expect(screen.queryByText("b.png")).not.toBeInTheDocument();
  });

  it("lets photos replace a file", async () => {
    renderChat({ ...textOnly, upload: vi.fn() });
    pick(fileInput(), pdf("menu.pdf"));
    await screen.findByText("menu.pdf");

    pick(photosInput(), png("a.png"));

    expect(await screen.findByText("a.png")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByText("menu.pdf")).not.toBeInTheDocument(),
    );
  });
});
