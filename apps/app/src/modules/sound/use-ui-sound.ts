import { useAtomValue } from "jotai";
import { useCallback, useEffect } from "react";

import { playUISound, primeUISound, type UISoundCue } from "./ui-sound-player";
import { soundEnabledAtom } from "./state";

/** Returns a `play(cue)` that stays silent when the user turned sounds off. */
export const useUISound = () => {
  const soundOn = useAtomValue(soundEnabledAtom);

  useEffect(() => {
    if (soundOn) void primeUISound();
  }, [soundOn]);

  return useCallback(
    (cue: UISoundCue) => {
      if (soundOn) playUISound(cue);
    },
    [soundOn],
  );
};
