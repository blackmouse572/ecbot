/**
 * Utility to detect circular dependencies in objects
 * Helps identify which fields are causing "Maximum call stack size exceeded" errors
 */

interface CircularPath {
    path: string[];
    value: any;
    type: string;
}

export class CircularDependencyDebugger {
    /**
     * Analyzes an object and finds all circular references
     * @param obj - The object to analyze
     * @param maxDepth - Maximum depth to traverse (default 10)
     * @returns Array of circular paths found
     */
    static findCircularReferences(
        obj: any,
        maxDepth: number = 10
    ): CircularPath[] {
        const circularPaths: CircularPath[] = [];
        const visited = new WeakSet();

        const traverse = (current: any, path: string[], depth: number = 0) => {
            // Stop if we've gone too deep
            if (depth > maxDepth) {
                circularPaths.push({
                    path: [...path],
                    value: current,
                    type: 'MAX_DEPTH_EXCEEDED',
                });
                return;
            }

            // Skip primitives and null
            if (current === null || typeof current !== 'object') {
                return;
            }

            // Check for circular reference
            if (visited.has(current)) {
                circularPaths.push({
                    path: [...path],
                    value: current,
                    type: 'CIRCULAR_REFERENCE',
                });
                return;
            }

            visited.add(current);

            // Handle arrays
            if (Array.isArray(current)) {
                current.forEach((item, index) => {
                    traverse(item, [...path, `[${index}]`], depth + 1);
                });
            }
            // Handle objects
            else {
                Object.keys(current).forEach(key => {
                    try {
                        const value = current[key];
                        traverse(value, [...path, key], depth + 1);
                    } catch (err) {
                        circularPaths.push({
                            path: [...path, key],
                            value: `[Error accessing: ${err.message}]`,
                            type: 'ERROR_ACCESSING_PROPERTY',
                        });
                    }
                });
            }
        };

        traverse(obj, ['root']);
        return circularPaths;
    }

    /**
     * Pretty prints circular dependencies
     */
    static printCircularDependencies(obj: any): void {
        const circular = this.findCircularReferences(obj);

        if (circular.length === 0) {
            console.log('✅ No circular references found');
            return;
        }

        console.log(`\n⚠️  Found ${circular.length} circular reference(s):\n`);

        circular.forEach((item, index) => {
            console.log(`${index + 1}. Path: ${item.path.join('.')}`);
            console.log(`   Type: ${item.type}`);
            console.log(
                `   Value: ${typeof item.value === 'object' ? item.value?.constructor?.name : typeof item.value}`
            );
            console.log('');
        });
    }

    /**
     * Analyzes an object for transformation issues
     * Shows nested objects that might cause plainToInstance problems
     */
    static analyzeTransformationIssues(obj: any): void {
        console.log('\n🔍 Transformation Analysis:\n');

        const traverse = (current: any, path: string[], depth: number = 0) => {
            if (depth > 5 || current === null || typeof current !== 'object') {
                return;
            }

            if (Array.isArray(current)) {
                if (current.length > 0) {
                    console.log(
                        `${'  '.repeat(depth)}📦 Array at ${path.join('.')} (${current.length} items)`
                    );
                    if (current[0] && typeof current[0] === 'object') {
                        console.log(
                            `${'  '.repeat(depth + 1)}├─ Item type: ${current[0]?.constructor?.name}`
                        );
                        traverse(current[0], [...path, '[0]'], depth + 2);
                    }
                }
            } else {
                const className = current?.constructor?.name;
                if (className && className !== 'Object') {
                    console.log(
                        `${'  '.repeat(depth)}🔗 Object at ${path.join('.')} (${className})`
                    );
                }

                Object.keys(current).forEach(key => {
                    try {
                        const value = current[key];
                        if (
                            value &&
                            typeof value === 'object' &&
                            value?.constructor?.name &&
                            value?.constructor?.name !== 'Object' &&
                            value?.constructor?.name !== 'Array'
                        ) {
                            console.log(
                                `${'  '.repeat(depth + 1)}├─ ${key}: ${value?.constructor?.name}`
                            );
                            traverse(value, [...path, key], depth + 2);
                        }
                    } catch (err) {
                        console.log(
                            `${'  '.repeat(depth + 1)}├─ ${key}: [ERROR: ${err.message}]`
                        );
                    }
                });
            }
        };

        traverse(obj, ['obj'], 0);
    }

    /**
     * Safe log - prevents stack overflow when logging circular objects
     */
    static safeLog(obj: any, maxDepth: number = 3): string {
        try {
            return JSON.stringify(obj, (key, value) => {
                if (key.startsWith('_')) return '[MikroORM property]';
                if (value && typeof value === 'object') {
                    if (value?.constructor?.name === 'UserEntity')
                        return `[UserEntity: ${value?.id}]`;
                    if (value?.constructor?.name === 'WorkspaceEntity')
                        return `[WorkspaceEntity: ${value?.id}]`;
                    if (value?.constructor?.name === 'ChatbotEntity')
                        return `[ChatbotEntity: ${value?.id}]`;
                    if (value?.constructor?.name === 'AccountEntity')
                        return `[AccountEntity: ${value?.id}]`;
                }
                return value;
            });
        } catch (err) {
            return `[Error serializing object: ${err.message}]`;
        }
    }
}
