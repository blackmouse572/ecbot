export const WORKSPACE_SEAT_LIMIT = Symbol('WORKSPACE_SEAT_LIMIT');

/**
 * Member seat seam. Absent in the public build: workspaces take any number
 * of members. Ecbot Cloud provides it from the workspace's current plan,
 * read on every invite and join so a plan change applies at once.
 */
export interface WorkspaceSeatLimit {
    /** Members (owner included) the workspace may have; null means unlimited. */
    getSeatLimit(workspaceId: string): Promise<number | null>;
}
