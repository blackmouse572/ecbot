import { describe, expect, it } from "vitest";
import i18n from "./index";

describe("i18n", () => {
  it("does not HTML-escape interpolated values (React escapes them)", () => {
    expect(
      i18n.t("agentBuilder.ui.templateAnswer", {
        lng: "en",
        name: "Restaurant & café",
      }),
    ).toBe("Template: Restaurant & café");
  });
});
