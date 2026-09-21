import { ArrowDown } from "@medusajs/icons";
import { clx, IconButton } from "@medusajs/ui";
import type { ComponentProps, HTMLAttributes, RefObject } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

// ============================================================================
// MessageScroller — intent-aware chat transcript scroller. Replaces
// `use-stick-to-bottom`: it follows the live edge ONLY while the reader is
// already at the bottom, releases the moment they scroll up, preserves scroll
// position when older messages are prepended, and exposes `onReachTop` for
// infinite-scroll pagination. Pure refs/observers — no external dependency.
// ============================================================================

// Treat "within this many px of the bottom" as at-bottom (rounding slack).
const AT_BOTTOM_THRESHOLD = 24;
// When content grows and the viewport is within this many px of the top, assume
// a prepend (older messages) and preserve the reader's position.
const PREPEND_PRESERVE_THRESHOLD = 300;

type MessageScrollerContextValue = {
  viewportRef: RefObject<HTMLDivElement | null>;
  contentRef: RefObject<HTMLDivElement | null>;
  stickRef: RefObject<boolean>;
  isAtBottom: boolean;
  setIsAtBottom: (v: boolean) => void;
  scrollToEnd: (behavior?: ScrollBehavior) => void;
};

const MessageScrollerContext =
  createContext<MessageScrollerContextValue | null>(null);

export const useMessageScroller = () => {
  const ctx = useContext(MessageScrollerContext);
  if (!ctx) {
    throw new Error(
      "MessageScroller components must be used within <MessageScroller>",
    );
  }
  return ctx;
};

export type MessageScrollerProps = HTMLAttributes<HTMLDivElement>;

export const MessageScroller = ({
  className,
  children,
  ...props
}: MessageScrollerProps) => {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  // Start pinned to the live edge (open at the latest message).
  const stickRef = useRef(true);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const scrollToEnd = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = viewportRef.current;
    if (!el) {
      return;
    }
    stickRef.current = true;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  const value = useMemo<MessageScrollerContextValue>(
    () => ({
      viewportRef,
      contentRef,
      stickRef,
      isAtBottom,
      setIsAtBottom,
      scrollToEnd,
    }),
    [isAtBottom, scrollToEnd],
  );

  return (
    <MessageScrollerContext.Provider value={value}>
      <div
        className={clx("relative flex min-h-0 flex-1 flex-col", className)}
        {...props}
      >
        {children}
      </div>
    </MessageScrollerContext.Provider>
  );
};

export type MessageScrollerViewportProps = HTMLAttributes<HTMLDivElement> & {
  /** Called when the viewport is scrolled near the top (for loading older messages). */
  onReachTop?: () => void;
  /** Distance from the top (px) that triggers `onReachTop`. */
  reachTopThreshold?: number;
};

export const MessageScrollerViewport = ({
  className,
  children,
  onReachTop,
  reachTopThreshold = 80,
  ...props
}: MessageScrollerViewportProps) => {
  const { viewportRef, contentRef, stickRef, setIsAtBottom } =
    useMessageScroller();
  const prevHeightRef = useRef(0);
  // Latest callbacks/values without re-subscribing the observers.
  const onReachTopRef = useRef(onReachTop);
  const reachTopThresholdRef = useRef(reachTopThreshold);
  onReachTopRef.current = onReachTop;
  reachTopThresholdRef.current = reachTopThreshold;

  const recomputeAtBottom = useCallback(
    (el: HTMLElement) => {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      const atBottom = distance <= AT_BOTTOM_THRESHOLD;
      stickRef.current = atBottom;
      setIsAtBottom(atBottom);
    },
    [setIsAtBottom, stickRef],
  );

  // Scroll listener: track intent (at-bottom vs scrolled away) + reach-top.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) {
      return;
    }
    const onScroll = () => {
      recomputeAtBottom(el);
      if (el.scrollTop <= reachTopThresholdRef.current) {
        onReachTopRef.current?.();
      }
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [viewportRef, recomputeAtBottom]);

  // Follow the live edge while pinned; preserve position on prepend.
  useEffect(() => {
    const el = viewportRef.current;
    const content = contentRef.current;
    if (!el || !content) {
      return;
    }
    prevHeightRef.current = el.scrollHeight;

    const observer = new ResizeObserver(() => {
      const newHeight = el.scrollHeight;
      const prevHeight = prevHeightRef.current;

      if (stickRef.current) {
        // Following the stream: jump instantly to the bottom.
        el.scrollTop = el.scrollHeight;
      } else if (
        newHeight > prevHeight &&
        el.scrollTop <= PREPEND_PRESERVE_THRESHOLD
      ) {
        // Older messages prepended near the top: keep the reader in place.
        el.scrollTop += newHeight - prevHeight;
      }

      prevHeightRef.current = newHeight;
      recomputeAtBottom(el);
    });

    observer.observe(content);
    return () => observer.disconnect();
  }, [viewportRef, contentRef, stickRef, recomputeAtBottom]);

  return (
    <div
      ref={viewportRef}
      className={clx("scroll-fade-y min-h-0 flex-1 overflow-y-auto", className)}
      {...props}
    >
      <div ref={contentRef}>{children}</div>
    </div>
  );
};

export type MessageScrollerContentProps = HTMLAttributes<HTMLDivElement>;

export const MessageScrollerContent = ({
  className,
  ...props
}: MessageScrollerContentProps) => (
  <div
    role="log"
    aria-live="polite"
    className={clx("flex flex-col gap-4 p-4", className)}
    {...props}
  />
);

export type MessageScrollerItemProps = HTMLAttributes<HTMLDivElement> & {
  messageId?: string;
  /** Marks a turn boundary (typically user messages). */
  scrollAnchor?: boolean;
};

export const MessageScrollerItem = ({
  messageId,
  scrollAnchor,
  className,
  ...props
}: MessageScrollerItemProps) => (
  <div
    data-message-id={messageId}
    data-scroll-anchor={scrollAnchor ? "" : undefined}
    className={clx(className)}
    {...props}
  />
);

export type MessageScrollerButtonProps = ComponentProps<typeof IconButton>;

export const MessageScrollerButton = ({
  className,
  onClick,
  ...props
}: MessageScrollerButtonProps) => {
  const { isAtBottom, scrollToEnd } = useMessageScroller();

  if (isAtBottom) {
    return null;
  }

  return (
    <IconButton
      type="button"
      variant="transparent"
      onClick={(e) => {
        scrollToEnd();
        onClick?.(e);
      }}
      className={clx(
        "-translate-x-1/2 absolute bottom-4 left-1/2 rounded-full border border-ui-border-base bg-ui-bg-base shadow-elevation-card-hover hover:bg-ui-bg-base-hover",
        className,
      )}
      {...props}
    >
      <ArrowDown className="size-4" />
    </IconButton>
  );
};
