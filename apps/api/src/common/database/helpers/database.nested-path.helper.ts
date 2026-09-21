/**
 * Helper to convert nested path strings to MikroORM query objects
 * Examples:
 *   "tags.tag" with $in operator -> { tags: { tag: { $in: [...] } } }
 *   "user.email" with $eq operator -> { user: { email: { $eq: "..." } } }
 */
export class DatabaseNestedPathHelper {
    /**
     * Build nested query object from dotted path string
     * @param path - Dotted path like "tags.tag"
     * @param value - Query value or operator object like { $in: [...] }
     * @returns Nested query object
     */
    static buildNestedQuery(path: string, value: any): Record<string, any> {
        const parts = path.split('.');

        if (parts.length === 1) {
            return { [parts[0]]: value };
        }

        // Build nested object from right to left
        let result = value;
        for (let i = parts.length - 1; i >= 0; i--) {
            result = { [parts[i]]: result };
        }

        return result;
    }

    /**
     * Check if path is nested (contains dot)
     * @param path - Path to check
     * @returns True if path is nested
     */
    static isNestedPath(path: string): boolean {
        return path.includes('.');
    }

    /**
     * Get root field name from nested path
     * @param path - Path like "tags.tag"
     * @returns Root field like "tags"
     */
    static getRootField(path: string): string {
        return path.split('.')[0];
    }

    /**
     * Get leaf field name from nested path
     * @param path - Path like "tags.tag"
     * @returns Leaf field like "tag"
     */
    static getLeafField(path: string): string {
        const parts = path.split('.');
        return parts[parts.length - 1];
    }
}
