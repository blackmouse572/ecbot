import { createUISFX, type CueName, type UISFXPlayer } from "uisfx";

let player: UISFXPlayer | undefined;

/**
 * Creates the uisfx player and unlocks audio on the user's first click or
 * key press: browsers block sound until then. Sounds are synthesized, so
 * nothing is downloaded.
 */
export const primeUISound = () => {
  if (player) return;
  player = createUISFX({ pack: "soft" });
  const unlock = () => void player?.unlock();
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
};

export const playUISound = (cue: CueName) => {
  primeUISound();
  player?.play(cue);
};

export type { CueName as UISoundCue };
