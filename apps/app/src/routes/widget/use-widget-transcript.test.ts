import { describe, expect, it } from "vitest";
import { toUiMessage } from "./use-widget-transcript";

describe("toUiMessage", () => {
  it("restores a bot image as a file part after the text", () => {
    expect(
      toUiMessage({
        id: "m1",
        authorType: "BOT",
        text: "Mẫu này nè",
        dateSent: "2026-01-01T00:00:00Z",
        attachments: [
          { type: "image", url: "https://cdn/s.jpg" },
          { type: "image" },
        ],
      }),
    ).toEqual({
      id: "m1",
      role: "assistant",
      parts: [
        { type: "text", text: "Mẫu này nè" },
        { type: "file", url: "https://cdn/s.jpg", mediaType: "image/*" },
      ],
    });
  });

  it("restores a bot PDF as a named file part", () => {
    expect(
      toUiMessage({
        id: "m3",
        authorType: "BOT",
        dateSent: "2026-01-01T00:00:00Z",
        attachments: [
          { type: "file", url: "https://cdn/menu.pdf", name: "Menu.pdf" },
        ],
      }).parts,
    ).toEqual([
      {
        type: "file",
        url: "https://cdn/menu.pdf",
        mediaType: "application/pdf",
        providerMetadata: { eccho: { filename: "Menu.pdf" } },
      },
    ]);
  });

  it("keeps a plain text message as one text part", () => {
    expect(
      toUiMessage({
        id: "m2",
        authorType: "USER",
        text: "hi",
        dateSent: "2026-01-01T00:00:00Z",
      }).parts,
    ).toEqual([{ type: "text", text: "hi" }]);
  });

  // #257: the widget draws a staff reply apart from the agent's.
  it("marks a staff reply so the widget can tell it from the agent", () => {
    expect(
      toUiMessage({
        id: "m4",
        authorType: "OPERATOR",
        text: "Chào bạn, mình là nhân viên shop",
        dateSent: "2026-01-01T00:00:00Z",
      }),
    ).toMatchObject({
      role: "assistant",
      metadata: { authorType: "OPERATOR" },
    });
  });
});
