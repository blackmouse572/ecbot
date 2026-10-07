import type { PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

const KEY = "impersonation-banner-ui";
const DRAG_SLOP_PX = 4;
type UiState = { x: number; minimized: boolean };

const read = (): UiState => {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) return { x: 0, minimized: false, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { x: 0, minimized: false };
};

export function useBannerUi() {
  const [state, setState] = useState<UiState>(read);
  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  const dragging = useRef<{ startX: number; baseX: number } | null>(null);
  // Set once a gesture moves past the click slop. The browser still fires a
  // click on the (pointer-captured) pill after a drag; consumeDrag() lets the
  // minimized pill swallow that click instead of expanding.
  const dragged = useRef(false);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      (e.target as Element).setPointerCapture?.(e.pointerId);
      dragging.current = { startX: e.clientX, baseX: state.x };
      dragged.current = false;
    },
    [state.x],
  );
  const onPointerMove = useCallback((e: ReactPointerEvent) => {
    if (!dragging.current) return;
    if (Math.abs(e.clientX - dragging.current.startX) > DRAG_SLOP_PX) {
      dragged.current = true;
    }
    const next = dragging.current.baseX + (e.clientX - dragging.current.startX);
    const half = 220;
    const max = Math.max(0, window.innerWidth / 2 - half + 200);
    setState((s) => ({ ...s, x: Math.max(-max, Math.min(max, next)) }));
  }, []);
  const onPointerUp = useCallback(() => {
    dragging.current = null;
  }, []);

  const consumeDrag = useCallback(() => {
    const was = dragged.current;
    dragged.current = false;
    return was;
  }, []);

  const setMinimized = useCallback(
    (minimized: boolean) => setState((s) => ({ ...s, minimized })),
    [],
  );

  return {
    x: state.x,
    minimized: state.minimized,
    setMinimized,
    consumeDrag,
    dragHandlers: { onPointerDown, onPointerMove, onPointerUp },
  };
}
