import { toWorkspaceSlug } from "../../onboard-create/utils";
import { SUFFIXED_SLUG_BASE_LENGTH } from "../constants";

/**
 * A second-try workspace address when the name's own one is taken: the name's
 * slug plus four random characters, e.g. "kunmart-x7q2".
 */
export const suffixedWorkspaceSlug = (name: string) => {
  const base = toWorkspaceSlug(name).slice(0, SUFFIXED_SLUG_BASE_LENGTH).replace(/-+$/, "") || "shop";
  const suffix = Math.random().toString(36).slice(2, 6).padEnd(4, "0");
  return `${base}-${suffix}`;
};
