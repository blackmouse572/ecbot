export const KB_STORAGE_LIMIT = Symbol('KB_STORAGE_LIMIT');

/**
 * Knowledge base storage seam. Absent in the public build: uploads are never
 * capped. Ecbot Cloud provides it from the workspace's subscription plan
 * (the `free` plan gets `billing.freePlanKbStorageBytes`).
 */
export interface KbStorageLimit {
    /** Bytes the workspace may store in its knowledge bases; null means unlimited. */
    getLimitBytes(workspaceId: string): Promise<number | null>;
}
