import { atomWithStorage } from "jotai/utils";

export const LAST_WORKSPACE_STORAGE_KEY = "last-workspace-slug";

/**
 * Slug of the workspace the user visited last. Used to auto-select a workspace
 * when landing on "/" or "/onboard" without a slug in the URL.
 */
export const lastWorkspaceSlugAtom = atomWithStorage<string | null>(
  LAST_WORKSPACE_STORAGE_KEY,
  null,
  undefined,
  // Read storage during init, not on mount: the redirects consuming this atom
  // navigate on their first render, before an onMount hydration would land.
  { getOnInit: true },
);
