import { describe, expect, it } from "vitest";
import { createChatbotSchema } from "./schemas";

const base = {
  name: "Bot",
  primaryLanguage: "en",
  modelTextName: "google/gemini-2.5-flash",
};

describe("createChatbotSchema optional number fields", () => {
  // The form hint says "Leave empty for no limit". With a bare
  // `z.coerce.number()`, `Number("") === 0` fails `.positive()`, so a user who
  // typed a value and then cleared it was stuck on a validation error with no
  // way back to "no limit".
  it("treats a cleared maxTokens as no limit", () => {
    const result = createChatbotSchema.safeParse({ ...base, maxTokens: "" });

    expect(result.success).toBe(true);
    expect(
      (result as { data: { maxTokens?: number } }).data.maxTokens,
    ).toBeUndefined();
  });

  it("still accepts a real value", () => {
    const result = createChatbotSchema.safeParse({
      ...base,
      maxTokens: "100000",
    });

    expect(result.success).toBe(true);
    expect((result as { data: { maxTokens?: number } }).data.maxTokens).toBe(
      100000,
    );
  });

  it("still rejects a non-positive value", () => {
    expect(
      createChatbotSchema.safeParse({ ...base, maxTokens: "0" }).success,
    ).toBe(false);
    expect(
      createChatbotSchema.safeParse({ ...base, maxTokens: "-5" }).success,
    ).toBe(false);
  });

  it("leaves an untouched field undefined", () => {
    const result = createChatbotSchema.safeParse(base);

    expect(result.success).toBe(true);
    expect(
      (result as { data: { maxTokens?: number } }).data.maxTokens,
    ).toBeUndefined();
  });
});
