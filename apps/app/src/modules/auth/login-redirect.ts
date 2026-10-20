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

/**
 * `path` with the `redirect` query carried over, so moving between login,
 * sign-up and email verification keeps where the user was headed (an invite
 * link for someone who has no account yet).
 */
export function withRedirect(path: string, redirect: string | null): string {
  return redirect ? `${path}?redirect=${encodeURIComponent(redirect)}` : path;
}

/**
 * The email an invite link was sent to, read from its token, to prefill the
 * sign-up form. Only a hint: the API still checks the token when joining.
 */
export function invitedEmailFromRedirect(
  redirect: string | null,
): string | undefined {
  if (!redirect?.startsWith("/join?")) return undefined;
  const token = new URLSearchParams(redirect.split("?")[1]).get("tokens");
  const payload = token?.split(".")[1];
  if (!payload) return undefined;
  try {
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const { invitedEmail } = JSON.parse(json) as { invitedEmail?: unknown };
    return typeof invitedEmail === "string" ? invitedEmail : undefined;
  } catch {
    return undefined;
  }
}
