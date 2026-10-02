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

// #149: the product calls the feature "Agent" everywhere. agentBuilder keeps
// "assistant" because there it names a kind of agent (personal assistant).
describe("feature name", () => {
  const leaves = (node: unknown, path: string[] = []): [string, string][] =>
    typeof node === "string"
      ? [[path.join("."), node]]
      : Object.entries(node as object).flatMap(([key, value]) =>
          leaves(value, [...path, key]),
        );

  it.each([
    ["en", en, /\b(chatbots?|assistants?)\b/i],
    ["vi", vi, /\b(chatbot|trợ lý)/i],
  ])("%s copy never calls it a chatbot or assistant", (_, dict, pattern) => {
    const offenders = leaves(dict)
      .filter(([key]) => !key.startsWith("agentBuilder."))
      .filter(([, value]) => pattern.test(value))
      .map(([key]) => key);

    expect(offenders).toEqual([]);
  });
});
