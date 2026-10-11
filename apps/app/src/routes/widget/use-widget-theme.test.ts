import { describe, expect, it } from "vitest";
import { resolveWidgetTheme } from "./use-widget-theme";

describe("resolveWidgetTheme", () => {
  it("is light by default, whatever the visitor's device prefers", () => {
    expect(resolveWidgetTheme("", true)).toBe("light");
  });

  it("uses the theme the site asked for", () => {
    expect(resolveWidgetTheme("?theme=dark", false)).toBe("dark");
    expect(resolveWidgetTheme("?theme=light", true)).toBe("light");
  });

  it("follows the visitor's device on auto", () => {
    expect(resolveWidgetTheme("?theme=auto", true)).toBe("dark");
    expect(resolveWidgetTheme("?theme=auto", false)).toBe("light");
  });

  it("ignores an unknown value", () => {
    expect(resolveWidgetTheme("?theme=purple", true)).toBe("light");
  });
});
