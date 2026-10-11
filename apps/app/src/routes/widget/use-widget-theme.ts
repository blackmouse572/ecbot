import { useEffect } from "react";

type WidgetTheme = "light" | "dark";

const DARK_QUERY = "(prefers-color-scheme: dark)";

/**
 * The widget's colour scheme, from the `?theme=` the loader passes through
 * from the embed's `data-theme`. Light unless the site asks otherwise: the
 * widget sits on someone else's page, so neither the operator's own app theme
 * cookie nor the visitor's device should turn it dark uninvited. `auto` opts
 * in to following the visitor's device.
 */
export function resolveWidgetTheme(
  search: string,
  prefersDark: boolean,
): WidgetTheme {
  const requested = new URLSearchParams(search).get("theme");
  if (requested === "dark") return "dark";
  if (requested === "auto") return prefersDark ? "dark" : "light";
  return "light";
}

/**
 * Applies the embed's theme to the iframe document, over the app's own. The
 * widget route is lazy, so this runs after ThemeProvider's mount-time effect,
 * which only runs again when an operator picks a theme (never in the widget).
 */
export function useWidgetTheme() {
  useEffect(() => {
    const media = window.matchMedia(DARK_QUERY);
    const apply = () => {
      const theme = resolveWidgetTheme(window.location.search, media.matches);
      const html = document.documentElement;
      html.classList.remove(theme === "light" ? "dark" : "light");
      html.classList.add(theme);
      html.style.colorScheme = theme;
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);
}
