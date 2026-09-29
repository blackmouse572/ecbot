import type { Location } from "react-router-dom";

/**
 * The login URL that sends the user back to `location` afterwards. The query
 * string is kept (an invite link's `?tokens=` lives there) and the whole
 * target is encoded, so its own `?`/`&` do not leak into the login URL.
 */
export function loginRedirectPath(
  location: Pick<Location, "pathname" | "search">,
): string {
  const target = `${location.pathname}${location.search}`;
  return `/login?redirect=${encodeURIComponent(target)}`;
}

/**
 * Where to go after login: the `redirect` query value when it is a path on
 * this site, otherwise home. `//host` and `/\host` are rejected because the
 * browser reads them as another origin.
 */
export function loginRedirectTarget(redirect: string | null): string {
  if (!redirect?.startsWith("/") || /^\/[/\\]/.test(redirect)) {
    return "/";
  }
  return redirect;
}
