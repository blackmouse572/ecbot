import { describe, expect, it } from "vitest";
import { createChatbotSchema } from "./schemas";

const base = { name: "Support bot" };

// `Number("") === 0`, so a bare `z.coerce.number()` turns a cleared field into
// a real 0: `.default()` never fires and the form quietly submits zero.
describe("createChatbotSchema numeric fields", () => {
  it("falls back to the default when temperature is cleared", () => {
    const result = createChatbotSchema.safeParse({
      ...base,
      modelTemperature: "",
    });

    expect(result.success).toBe(true);
    expect(result.data?.modelTemperature).toBe(1.0);
  });

  it("applies the default when temperature is absent", () => {
    expect(createChatbotSchema.safeParse(base).data?.modelTemperature).toBe(
      1.0,
    );
  });

  it("still coerces and range-checks a real temperature", () => {
    expect(
      createChatbotSchema.safeParse({ ...base, modelTemperature: "0" }).data
        ?.modelTemperature,
    ).toBe(0);
    expect(
      createChatbotSchema.safeParse({ ...base, modelTemperature: "1.5" }).data
        ?.modelTemperature,
    ).toBe(1.5);
    expect(
      createChatbotSchema.safeParse({ ...base, modelTemperature: "9" }).success,
    ).toBe(false);
  });

  it("treats a cleared token limit as unset", () => {
    const result = createChatbotSchema.safeParse({ ...base, maxTokens: "" });

    expect(result.success).toBe(true);
    expect(result.data?.maxTokens).toBeUndefined();
  });
});
