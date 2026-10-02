/**
 * Preview of the slug the API derives from a workspace name or typed web
 * address (apps/api `toWorkspaceSlug`, slugify with the vi locale): accents
 * and "đ" folded to ASCII, lowercase, other symbols dropped, spaces to hyphens.
 */
export const toWorkspaceSlug = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "-")
    .replace(/^-+|-+$/g, "");
