export const CUSTOMER_LIMIT = Symbol('CUSTOMER_LIMIT');

/**
 * Customer contact seam. Absent in the public build: every new sender becomes
 * a Customer. Ecbot Cloud provides it from the workspace's current plan, read
 * each time a new sender writes in so a plan change applies at once.
 */
export interface CustomerLimit {
    /** Customers the workspace may keep; null means unlimited. */
    getCustomerLimit(workspaceId: string): Promise<number | null>;
}
