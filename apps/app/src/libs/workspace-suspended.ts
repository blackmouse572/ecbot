/** The API's 403 for a workspace an admin suspended. */
export const WORKSPACE_SUSPENDED_STATUS_CODE = 5215;

/** The client rejects with the axios error; the API body is on response.data. */
export function isWorkspaceSuspendedError(error: unknown): boolean {
  return (
    (error as { response?: { data?: { statusCode?: number } } } | null)
      ?.response?.data?.statusCode === WORKSPACE_SUSPENDED_STATUS_CODE
  );
}
