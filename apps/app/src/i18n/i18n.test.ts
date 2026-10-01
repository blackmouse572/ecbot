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

// After sign-up the page asks for the emailed code; a toast saying "log in"
// pointed new users the wrong way.
describe("sign-up success toast", () => {
  it.each([
    ["en", /code/i, /log in/i],
    ["vi", /mã/i, /đăng nhập/i],
  ])(
    "%s points to the emailed code, not to logging in",
    (lang, wants, avoids) => {
      const message = i18n.t("app.auth.register.success.message", {
        lng: lang,
      });

      expect(message).toMatch(wants);
      expect(message).not.toMatch(avoids);
    },
  );
});
