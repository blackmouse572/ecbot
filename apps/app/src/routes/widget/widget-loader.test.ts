import { afterEach, describe, expect, it, vi } from "vitest";
import LOADER from "../../../public/widget.js?raw";

/** Runs the embed loader as a site would, with the given data-* attributes. */
const embed = (attrs: Record<string, string>, deviceDark: boolean) => {
  const script = document.createElement("script");
  script.src = "https://app.ecbot.dev/widget.js";
  script.setAttribute("data-widget-key", "wk_1");
  for (const [name, value] of Object.entries(attrs)) {
    script.setAttribute(name, value);
  }
  Object.defineProperty(document, "currentScript", {
    configurable: true,
    get: () => script,
  });
  vi.stubGlobal(
    "matchMedia",
    (query: string) =>
      ({
        matches: query === "(prefers-color-scheme: dark)" && deviceDark,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList,
  );
  new Function(LOADER)();
  return new URL(document.querySelector("iframe")!.src).searchParams.get(
    "theme",
  );
};

// #248 review: inside an iframe, prefers-color-scheme follows the embedding
// page rather than the device, so "auto" is resolved on the host page.
describe("widget.js theme", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.unstubAllGlobals();
  });

  it("resolves auto from the visitor's device on the host page", () => {
    expect(embed({ "data-theme": "auto" }, true)).toBe("dark");
    document.body.innerHTML = "";
    expect(embed({ "data-theme": "auto" }, false)).toBe("light");
  });

  it("accepts the value in any case and defaults to light", () => {
    expect(embed({ "data-theme": "Dark" }, false)).toBe("dark");
    document.body.innerHTML = "";
    expect(embed({}, true)).toBe("light");
  });
});
