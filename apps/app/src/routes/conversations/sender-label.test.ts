import { describe, expect, it } from "vitest";
import { senderLabel } from "./sender-label";

const t = (key: string, options?: Record<string, unknown>) =>
  `${key}:${options?.suffix ?? ""}`;

describe("senderLabel", () => {
  it("uses the sender's name when there is one", () => {
    expect(
      senderLabel(
        {
          senderId: "2559b020-b33f-4f92-8d4e-5f1a2b3c4d5e",
          senderName: "Lan",
          account: { type: "WEBSITE_WIDGET" },
        },
        t,
      ),
    ).toBe("Lan");
  });

  // #257: an anonymous website visitor showed as a raw UUID.
  it("names an anonymous website visitor with a short suffix", () => {
    expect(
      senderLabel(
        {
          senderId: "2559b020-b33f-4f92-8d4e-5f1a2b3c4d5e",
          account: { type: "WEBSITE_WIDGET" },
        },
        t,
      ),
    ).toBe("widget.visitorName:2559");
  });

  it("keeps the platform id on other channels", () => {
    expect(
      senderLabel({ senderId: "123456", account: { type: "TELEGRAM" } }, t),
    ).toBe("123456");
  });
});
