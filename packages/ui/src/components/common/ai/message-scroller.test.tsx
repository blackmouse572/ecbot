import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  MessageScroller, MessageScrollerButton, MessageScrollerContent, MessageScrollerViewport,
} from "./message-scroller";

// The scrolling element is now Radix's ScrollArea viewport, not a plain div.
const getViewport = (container: HTMLElement) => container.querySelector("[data-radix-scroll-area-viewport]") as HTMLElement;

function mockScrollMetrics(el: HTMLElement, metrics: { scrollTop: number; scrollHeight: number; clientHeight: number }) {
  Object.defineProperty(el, "scrollTop", { value: metrics.scrollTop, writable: true, configurable: true });
  Object.defineProperty(el, "scrollHeight", { value: metrics.scrollHeight, configurable: true });
  Object.defineProperty(el, "clientHeight", { value: metrics.clientHeight, configurable: true });
}

describe("MessageScrollerViewport (Radix scroll area)", () => {
  it("renders through the Radix scroll-area viewport", () => {
    const { container } = render(
      <MessageScroller>
        <MessageScrollerViewport>
          <MessageScrollerContent>hi</MessageScrollerContent>
        </MessageScrollerViewport>
      </MessageScroller>,
    );
    expect(getViewport(container)).toBeInTheDocument();
    expect(screen.getByText("hi")).toBeInTheDocument();
  });

  it("tracks stick-to-bottom off the real Radix viewport element (scroll away shows the jump button, scroll back hides it)", () => {
    const { container } = render(
      <MessageScroller>
        <MessageScrollerViewport>
          <MessageScrollerContent>hi</MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton />
      </MessageScroller>,
    );
    const viewport = getViewport(container);
    // Starts pinned to the bottom: no jump-to-bottom button.
    expect(screen.queryByRole("button")).not.toBeInTheDocument();

    // Scroll away from the bottom.
    mockScrollMetrics(viewport, { scrollTop: 0, scrollHeight: 1000, clientHeight: 500 });
    fireEvent.scroll(viewport);
    expect(screen.getByRole("button")).toBeInTheDocument();

    // Scroll back to the bottom.
    mockScrollMetrics(viewport, { scrollTop: 500, scrollHeight: 1000, clientHeight: 500 });
    fireEvent.scroll(viewport);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("fires onReachTop when the real Radix viewport element scrolls near the top", () => {
    const onReachTop = vi.fn();
    const { container } = render(
      <MessageScroller>
        <MessageScrollerViewport onReachTop={onReachTop} reachTopThreshold={80}>
          <MessageScrollerContent>hi</MessageScrollerContent>
        </MessageScrollerViewport>
      </MessageScroller>,
    );
    const viewport = getViewport(container);

    mockScrollMetrics(viewport, { scrollTop: 500, scrollHeight: 1000, clientHeight: 500 });
    fireEvent.scroll(viewport);
    expect(onReachTop).not.toHaveBeenCalled();

    mockScrollMetrics(viewport, { scrollTop: 50, scrollHeight: 1000, clientHeight: 500 });
    fireEvent.scroll(viewport);
    expect(onReachTop).toHaveBeenCalledOnce();
  });

  it("forces the Radix inner wrapper to behave like a normal block so percentage-width bubbles never resolve against a shrink-wrapped width", () => {
    const { container } = render(
      <MessageScroller>
        <MessageScrollerViewport>
          <MessageScrollerContent>hi</MessageScrollerContent>
        </MessageScrollerViewport>
      </MessageScroller>,
    );
    const viewport = getViewport(container);
    expect(viewport.className).toContain("[&>div]:!block");
    expect(viewport.className).toContain("[&>div]:!min-w-0");
    expect(viewport.className).toContain("[&>div]:!w-full");
    // Radix always wraps the viewport's children in a div for its own
    // shrink-to-fit measurement; confirm the selector above targets it.
    expect(viewport.firstElementChild?.tagName).toBe("DIV");
  });
});
