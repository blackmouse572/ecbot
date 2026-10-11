import { createUISFX, type UISFXPlayer } from "uisfx";

let player: UISFXPlayer | undefined;

/**
 * Creates the uisfx player and unlocks audio on the user's first click or
 * key press: browsers block sound until then. Sounds are synthesized, so
 * nothing is downloaded.
 */
export const primeNotificationSound = () => {
  if (player) return;
  player = createUISFX({ pack: "soft" });
  const unlock = () => void player?.unlock();
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
};

export const playNotificationSound = () => {
  primeNotificationSound();
  player?.play("notification");
};
