import { describe, expect, it } from "vitest";
import { languageName } from "./language-name";

describe("languageName", () => {
  it("names the language in the viewer's locale", () => {
    expect(languageName("vi", "vi")).toBe("Tiếng Việt");
    expect(languageName("en", "vi")).toBe("Tiếng Anh");
    expect(languageName("vi", "en")).toBe("Vietnamese");
  });

  it("falls back to the code when it is not a language", () => {
    expect(languageName("not a code", "vi")).toBe("not a code");
  });
});
