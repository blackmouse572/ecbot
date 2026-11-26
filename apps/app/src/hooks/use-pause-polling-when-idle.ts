import { focusManager } from "@tanstack/react-query";
import { useEffect } from "react";

/**
 * Polls (`refetchInterval`) only run while the window counts as focused. A tab
 * left open and visible would poll all night and keep the database awake, so
 * after `idleMs` without input this reports the window as unfocused. The next
 * input hands focus back to the browser, which refetches what went stale.
 */
export const usePausePollingWhenIdle = (idleMs = 5 * 60_000) => {
  useEffect(() => {
    const inputEvents = [
      "pointerdown",
      "pointermove",
      "keydown",
      "wheel",
      "touchstart",
    ];
    let lastInput = Date.now();
    let paused = false;

    const onInput = () => {
      lastInput = Date.now();
      if (paused) {
        paused = false;
        focusManager.setFocused(undefined);
      }
    };
    const check = setInterval(() => {
      if (!paused && Date.now() - lastInput >= idleMs) {
        paused = true;
        focusManager.setFocused(false);
      }
    }, 30_000);

    for (const event of inputEvents) {
      window.addEventListener(event, onInput, { passive: true });
    }

    return () => {
      clearInterval(check);

      for (const event of inputEvents) {
        window.removeEventListener(event, onInput);
      }

      if (paused) focusManager.setFocused(undefined);
    };
  }, [idleMs]);
};
