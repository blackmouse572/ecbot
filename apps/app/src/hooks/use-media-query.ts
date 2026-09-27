import { useSyncExternalStore } from "react";

const hasMatchMedia = () => typeof window !== "undefined" && typeof window.matchMedia === "function";

/**
 * Reactive `window.matchMedia` result for a media query, e.g.
 * `useMediaQuery("(max-width: 768px)")`. Returns `false` during SSR / before
 * hydration and when `matchMedia` isn't implemented (jsdom declares it as
 * `undefined` rather than omitting it), then the live value on the client.
 */
export const useMediaQuery = (query: string): boolean => {
  const subscribe = (onChange: () => void) => {
    if (!hasMatchMedia()) return () => {};
    const mql = window.matchMedia(query);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  };

  const getSnapshot = () => (hasMatchMedia() ? window.matchMedia(query).matches : false);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
};
