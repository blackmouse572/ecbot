/** The API's 404 for a workspace that does not exist or is not yours. */
export const WORKSPACE_NOT_FOUND_STATUS_CODE = 5200;
/**
 * What an API without the single-404 change still answers a non-member
 * (400 "Member not found"). Kept so the app shows the right page whichever
 * deploys first.
 */
export const WORKSPACE_MEMBER_NOT_FOUND_STATUS_CODE = 5208;

/**
 * True only for "this workspace is not yours to open". A 5xx or a network
 * error stays false, so a passing backend failure never reads as "the
 * workspace doesn't exist".
 */
export function isWorkspaceNotFoundError(error: unknown): boolean {
  const statusCode = (
    error as { response?: { data?: { statusCode?: number } } } | null
  )?.response?.data?.statusCode;
  return (
    statusCode === WORKSPACE_NOT_FOUND_STATUS_CODE ||
    statusCode === WORKSPACE_MEMBER_NOT_FOUND_STATUS_CODE
  );
}
