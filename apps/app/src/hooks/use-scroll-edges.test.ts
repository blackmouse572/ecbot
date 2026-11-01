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

  const stubResizeObserver = () => {
    const resize = { fire: () => {} };
    vi.stubGlobal(
      "ResizeObserver",
      vi.fn(function (this: unknown, cb: () => void) {
        resize.fire = cb;
        return { observe: vi.fn(), disconnect: vi.fn() };
      }),
    );
    return resize;
  };

  it("re-measures when content grows without a scroll", () => {
    const resize = stubResizeObserver();
    const node = box(0, 200, 200);
    const { result } = renderHook(() => useScrollEdges(0));
    act(() => result.current.ref(node));
    expect(result.current.bottom).toBe(false);

    Object.defineProperty(node, "scrollHeight", { value: 600 });
    act(() => resize.fire());
    expect(result.current.bottom).toBe(true);
  });

  it("does not re-render on a resize that leaves the edges unchanged", () => {
    const resize = stubResizeObserver();
    let renders = 0;
    const { result } = renderHook(() => {
      renders += 1;
      return useScrollEdges(0);
    });
    act(() => result.current.ref(box(0, 500, 200)));
    const before = renders;
    act(() => resize.fire());
    expect(renders).toBe(before);
  });
});
