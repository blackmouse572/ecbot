import { useAtomValue, useSetAtom } from "jotai/react";
import { lastWorkspaceSlugAtom } from "./state";

export function useLastWorkspaceSlug() {
  return useAtomValue(lastWorkspaceSlugAtom);
}

export function useSetLastWorkspaceSlug() {
  return useSetAtom(lastWorkspaceSlugAtom);
}
