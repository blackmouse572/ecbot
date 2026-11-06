import { ROUTES } from "@/routes/constants";

/**
 * Where to land after switching from `fromSlug` to `toSlug`: the list page of
 * the section the user was in, so a detail id from the old workspace can't
 * open Not Found in the new one. Settings keeps its page (members, roles...).
 *
 *   /a/chatbot/123           -> /b/chatbot
 *   /a/settings/members/9    -> /b/settings/members
 */
export function switchWorkspacePath(
  pathname: string,
  fromSlug: string,
  toSlug: string,
): string {
  const segments = pathname.split("/").filter(Boolean);
  const rest = segments[0] === fromSlug ? segments.slice(1) : [];
  const keep = rest[0] === ROUTES.Settings ? 2 : 1;
  return ["", toSlug, ...rest.slice(0, keep)].join("/");
}
