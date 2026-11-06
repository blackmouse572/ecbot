import { useEffect } from "react";
import { analytics } from "./analytics";

/** Ties what follows to the workspace being viewed. */
export function useAnalyticsGroup(workspaceId: string | undefined) {
  useEffect(() => {
    analytics.group(workspaceId);
  }, [workspaceId]);
}
