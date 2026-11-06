import { ROUTES } from "@/routes";

/** The landing page of a workspace's settings. */
export const workspaceSettingsPath = (workspaceSlug: string) =>
  `/${workspaceSlug}/${ROUTES.Settings}/${ROUTES.Workspace}`;
