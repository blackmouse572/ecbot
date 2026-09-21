import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// jsdom lacks ResizeObserver, which the Radix primitives behind several
// @medusajs/ui controls (popovers, selects) construct on mount.
if (!("ResizeObserver" in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// jsdom doesn't implement Element.scroll/scrollTo, which the data-table's
// scrollable viewport calls on mount, nor scrollIntoView, which cmdk calls to
// keep the selected Command.Item visible. Provide no-op stubs so full renders
// don't throw.
if (typeof Element !== "undefined") {
  if (!Element.prototype.scroll) {
    Element.prototype.scroll = () => {};
  }
  if (!Element.prototype.scrollTo) {
    Element.prototype.scrollTo = () => {};
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
}

afterEach(() => {
  cleanup();
});
