import { useSyncExternalStore } from "react";

/**
 * Reactive `window.matchMedia` result for a media query, e.g.
 * `useMediaQuery("(max-width: 768px)")`. Returns `false` during SSR / before
 * hydration (no `matchMedia`), then the live value on the client.
 */
export const useMediaQuery = (query: string): boolean => {
  const subscribe = (onChange: () => void) => {
    const mql = window.matchMedia(query);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  };

  const getSnapshot = () =>
    typeof window !== "undefined" && "matchMedia" in window
      ? window.matchMedia(query).matches
      : false;

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
};
