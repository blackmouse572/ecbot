export type PushSupport =
  /** This browser has no Web Push. */
  | "unsupported"
  /** iPhone or iPad in Safari: push works only from the Home Screen app. */
  | "needs-install"
  /** The user blocked notifications for this site. */
  | "denied"
  | "ready";

/** True when running as the installed app rather than a browser tab. */
export function isStandalone(win: Window = window): boolean {
  return (
    win.matchMedia?.("(display-mode: standalone)").matches === true ||
    (win.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** iPhone, iPod or iPad (iPadOS reports itself as a Mac with touch). */
export function isIos(nav: Navigator = navigator): boolean {
  return (
    /iPad|iPhone|iPod/.test(nav.userAgent) ||
    (nav.platform === "MacIntel" && nav.maxTouchPoints > 1)
  );
}

export function getPushSupport(win: Window = window): PushSupport {
  // iOS hides PushManager outside the installed app, so check this first.
  if (isIos(win.navigator) && !isStandalone(win)) return "needs-install";
  if (
    !("serviceWorker" in win.navigator) ||
    !("PushManager" in win) ||
    !("Notification" in win)
  ) {
    return "unsupported";
  }
  if (win.Notification.permission === "denied") return "denied";
  return "ready";
}
