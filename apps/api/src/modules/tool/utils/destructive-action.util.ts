/** The parts of a discovered MCP action that say whether it destroys data. */
export interface IDestructiveActionInput {
    name: string;
    description?: string;
    /** Saved at discovery from the server's annotations. */
    destructive?: boolean;
    /** MCP tool annotations, as the server sent them. */
    annotations?: { destructiveHint?: boolean; readOnlyHint?: boolean };
}

const DESTRUCTIVE_VERBS = new Set([
    'delete',
    'remove',
    'destroy',
    'drop',
    'purge',
    'wipe',
    'truncate',
    'erase',
]);

const DESTRUCTIVE_WORDING =
    /cannot be undone|can't be undone|irreversible|permanently|dangerous/i;

const words = (name: string): string[] =>
    name
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(Boolean);

/**
 * Whether an action can destroy data (#177). The server's MCP annotations
 * win; without them, a destructive verb in the name or warning wording in
 * the description is enough, so "delete_all_orders" is never on by default.
 */
export const isDestructiveAction = (
    action: IDestructiveActionInput
): boolean => {
    if (action.destructive !== undefined) return action.destructive;
    if (action.annotations?.destructiveHint === true) return true;
    if (action.annotations?.readOnlyHint === true) return false;
    return (
        words(action.name).some(word => DESTRUCTIVE_VERBS.has(word)) ||
        DESTRUCTIVE_WORDING.test(action.description ?? '')
    );
};
