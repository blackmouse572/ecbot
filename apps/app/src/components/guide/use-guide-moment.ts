import { useWorkspace } from "@/hooks/api/workspace";
import { useCallback, useEffect, useState } from "react";
import { GUIDE_STORAGE_PREFIX } from "./constants";
import type { GuideMoment } from "./types";

const PENDING = "pending";
const DONE = "done";

// Storage can be blocked (private windows, strict settings); the moment is
// then skipped rather than breaking the page.
const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignored, see above
  }
};

/**
 * A one-time moment such as the tour after the first agent goes live. It
 * arms when this browser sees the workspace with none yet (`count` 0) and
 * opens once the count turns positive, so workspaces that were already
 * running never see it. `count` is undefined while loading.
 */
export function useGuideMoment(moment: GuideMoment, count: number | undefined) {
  const { workspace } = useWorkspace();
  const key = workspace
    ? `${GUIDE_STORAGE_PREFIX}.${moment}.${workspace.id}`
    : undefined;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!key || count === undefined) return;
    const state = read(key);
    if (count === 0 && !state) write(key, PENDING);
    if (count > 0 && state === PENDING) setOpen(true);
  }, [key, count]);

  const close = useCallback(() => {
    if (key) write(key, DONE);
    setOpen(false);
  }, [key]);

  return [open, close] as const;
}
