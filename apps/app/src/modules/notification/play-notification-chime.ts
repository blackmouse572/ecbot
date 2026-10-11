let context: AudioContext | undefined;

/**
 * A short two-note chime made with Web Audio, so there is no sound file to
 * ship. Browsers block audio until the user has interacted with the page;
 * in that case this is silently a no-op.
 */
export const playNotificationChime = () => {
  try {
    context ??= new AudioContext();
    void context.resume();
    const start = context.currentTime;
    [880, 1320].forEach((frequency, index) => {
      const at = start + index * 0.12;
      const oscillator = context!.createOscillator();
      const gain = context!.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.15, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.3);
      oscillator.connect(gain).connect(context!.destination);
      oscillator.start(at);
      oscillator.stop(at + 0.3);
    });
  } catch {
    // No Web Audio (old browser, test env): a missing chime is fine.
  }
};
