import { useEffect, useRef } from "react";

import type { UISoundCue } from "./ui-sound-player";
import { useUISound } from "./use-ui-sound";

/**
 * Plays the cue `pick(previous, next)` returns whenever `value` changes after
 * it was first seen. `undefined` means "not loaded yet" and is skipped; a new
 * `resetKey` (another page's id) starts over without a sound.
 */
export const useSoundOnChange = <T>(
  value: T | undefined,
  pick: (previous: T, next: T) => UISoundCue | null,
  resetKey?: unknown,
) => {
  const play = useUISound();
  const previous = useRef<{ key: unknown; value: T } | undefined>(undefined);
  const pickRef = useRef(pick);
  pickRef.current = pick;

  useEffect(() => {
    if (value === undefined) return;
    const last = previous.current;
    previous.current = { key: resetKey, value };
    if (!last || last.key !== resetKey || last.value === value) return;
    const cue = pickRef.current(last.value, value);
    if (cue) play(cue);
  }, [value, resetKey, play]);
};
