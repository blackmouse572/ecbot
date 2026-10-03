import slugify from "slugify";
import { WORKSPACE_SLUG_MAX_LENGTH } from "../constants";

/**
 * Preview of the slug the API creates from a workspace name or typed web
 * address. Mirrors apps/api `toWorkspaceSlug` (workspace-slug.util.ts) so the
 * URL shown is the URL the workspace gets.
 */
export const toWorkspaceSlug = (value: string) =>
  slugify(value, { lower: true, strict: true, locale: "vi" })
    .slice(0, WORKSPACE_SLUG_MAX_LENGTH)
    .replace(/-+$/, "");
