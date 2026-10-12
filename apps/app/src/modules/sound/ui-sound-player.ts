import type { CueName, UISFXPlayer } from "uisfx";

let player: UISFXPlayer | undefined;
let loading: Promise<void> | undefined;
let unlocked = false;

/**
 * Loads uisfx (its own chunk) and unlocks audio on the user's next click or
 * key press. Sounds are synthesized, so nothing else is downloaded.
 */
export const primeUISound = () =>
  (loading ??= import("uisfx").then(({ createUISFX }) => {
    player = createUISFX({ pack: "soft" });
    const unlock = () => {
      void player?.unlock().then((ok) => {
        if (!ok || unlocked) return;
        unlocked = true;
        window.removeEventListener("pointerdown", unlock);
        window.removeEventListener("keydown", unlock);
      });
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
  })).catch(() => {
    // The chunk failed to load (offline, new deploy): try again next time.
    loading = undefined;
  });

/**
 * Browsers keep audio locked until the user interacts with the page. A
 * sound asked for before that is dropped, not queued to play late.
 */
export const playUISound = (cue: CueName) => {
  if (unlocked) player?.play(cue);
};

export type { CueName as UISoundCue };
