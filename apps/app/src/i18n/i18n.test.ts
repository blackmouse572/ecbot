import { describe, expect, it } from "vitest";
import i18n from "./index";
import en from "./translations/en.json";
import vi from "./translations/vi.json";

describe("i18n", () => {
  it("does not HTML-escape interpolated values (React escapes them)", () => {
    expect(
      i18n.t("agentBuilder.ui.templateAnswer", {
        lng: "en",
        name: "Restaurant & café",
      }),
    ).toBe("Template: Restaurant & café");
  });

  // Product copy style rule: the em dash reads as machine-written (#179).
  it.each([
    ["en", en],
    ["vi", vi],
  ])("%s.json has no em dash", (_, messages) => {
    expect(JSON.stringify(messages)).not.toContain("\u2014");
  });
});
