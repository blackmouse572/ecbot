import { describe, expect, it } from "vitest";
import { chatErrorMessage } from "./chat-error-message";

describe("chatErrorMessage", () => {
  const fallback = "Something went wrong. Please try again.";

  it("shows the API's message, not the raw JSON body", () => {
    const body = JSON.stringify({
      statusCode: 5040,
      message:
        "The AI backend is currently unavailable. Please try again later.",
      _metadata: {
        path: "/api/v1/public/widget/k/messages",
        repoVersion: "1.0.0",
      },
    });
    expect(chatErrorMessage(new Error(body), fallback)).toBe(
      "The AI backend is currently unavailable. Please try again later.",
    );
  });

  it("falls back when the error is not an API body", () => {
    expect(chatErrorMessage(new Error("Failed to fetch"), fallback)).toBe(
      fallback,
    );
    expect(chatErrorMessage(new Error('{"statusCode":500}'), fallback)).toBe(
      fallback,
    );
    expect(chatErrorMessage(undefined, fallback)).toBe(fallback);
  });
});
