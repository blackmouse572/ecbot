import { isWorkspaceSuspendedError } from "./workspace-suspended";

/**
 * The API's 400 when a member (not the owner) calls an owner-only route
 * (WorkspaceOwnerGuard, apps/api workspace.owner.guard.ts).
 */
export const WORKSPACE_OWNER_REQUIRED_STATUS_CODE = 5208;

/**
 * The signed-in member may not read this: a 403, or the owner guard's
 * 400 5208. A suspended workspace's 403 is not a permission error; it keeps
 * going to the error boundary.
 */
export function isNoPermissionError(error: unknown): boolean {
  const response = (
    error as {
      response?: { status?: number; data?: { statusCode?: number } };
    } | null
  )?.response;
  if (response?.status === 403) return !isWorkspaceSuspendedError(error);
  return (
    response?.status === 400 &&
    response.data?.statusCode === WORKSPACE_OWNER_REQUIRED_STATUS_CODE
  );
}

/**
 * Whether a list page shows the no-permission state, and whether its error
 * belongs to the error boundary instead. `allowed` is the ability check run
 * before the list was fetched.
 */
export function readListAccess({
  allowed,
  isError,
  error,
}: {
  allowed: boolean;
  isError: boolean;
  error: unknown;
}) {
  const denied = !allowed || (isError && isNoPermissionError(error));

  return { denied, shouldThrow: isError && !denied };
}
