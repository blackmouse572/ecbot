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
