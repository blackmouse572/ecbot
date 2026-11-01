import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useScrollEdges } from "./use-scroll-edges";

const box = (scrollTop: number, scrollHeight: number, clientHeight: number) => {
  const node = document.createElement("div");
  node.appendChild(document.createElement("div"));
  Object.defineProperties(node, {
    scrollTop: { value: scrollTop, writable: true },
    scrollHeight: { value: scrollHeight, writable: true },
    clientHeight: { value: clientHeight, writable: true },
  });
  return node;
};

describe("useScrollEdges", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("flags the bottom edge while content sits below", () => {
    const { result } = renderHook(() => useScrollEdges(0));
    act(() => result.current.ref(box(0, 500, 200)));
    expect(result.current).toMatchObject({ top: false, bottom: true });
  });

  it("re-measures when the box or its content resizes", () => {
    let onResize = () => {};
    const observe = vi.fn();
    vi.stubGlobal(
      "ResizeObserver",
      vi.fn(function (this: unknown, cb: () => void) {
        onResize = cb;
        return { observe, disconnect: vi.fn() };
      }),
    );
    const node = box(0, 200, 200);
    const { result } = renderHook(() => useScrollEdges(0));
    act(() => result.current.ref(node));
    expect(result.current.bottom).toBe(false);
    expect(observe).toHaveBeenCalledWith(node);
    expect(observe).toHaveBeenCalledWith(node.firstElementChild);

    Object.defineProperty(node, "scrollHeight", { value: 600 });
    act(() => onResize());
    expect(result.current.bottom).toBe(true);
  });
});
