/** The parts of a discovered MCP action that say whether it destroys data. */
export interface IDestructiveActionInput {
    name: string;
    description?: string;
    /** Saved at discovery from the server's annotations. */
    destructive?: boolean;
    /** MCP tool annotations, as the server sent them. */
    annotations?: { destructiveHint?: boolean; readOnlyHint?: boolean };
}

/** Destructive even inside a run-together name ("bulkdelete", "DELETEORDER"). */
const STRONG_VERBS = [
    'delete',
    'remove',
    'destroy',
    'purge',
    'truncate',
    'erase',
    'wipe',
    'trash',
];

/** Destructive as a word of their own, or its -s / -ing form. */
const WORD_VERBS = [
    'drop',
    'cancel',
    'refund',
    'void',
    'revoke',
    'reset',
    'archive',
    'disable',
    'deactivate',
    'terminate',
    'clear',
    'overwrite',
    'unsubscribe',
    'transfer',
    // Vietnamese, without diacritics: xóa (delete), hủy (cancel).
    'xoa',
    'huy',
];

const WARNING_WORDING =
    /cannot be undone|can't be undone|irreversible|permanently|dangerous|khong the hoan tac|vinh vien|\bxoa\b/;

/** Lowercase, without Vietnamese diacritics, so "Xóa" reads as "xoa". */
const plain = (text: string): string =>
    text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();

const words = (name: string): string[] =>
    plain(name.replace(/([a-z0-9])([A-Z])/g, '$1 $2'))
        .split(/[^a-z0-9]+/)
        .filter(Boolean);

const isWordVerb = (word: string): boolean =>
    WORD_VERBS.some(
        verb =>
            word === verb ||
            word === `${verb}s` ||
            word === `${verb}es` ||
            word === `${verb}ing` ||
            word === `${verb.replace(/e$/, '')}ing`
    );

// "undelete" restores, so a strong verb right after "un" does not count.
const hasStrongVerb = (word: string): boolean =>
    STRONG_VERBS.some(verb => {
        const at = word.indexOf(verb);
        return at >= 0 && word.slice(Math.max(0, at - 2), at) !== 'un';
    });

/**
 * Whether an action can destroy data (#177). The server's MCP annotations
 * win, read the way the spec defaults them (a tool that is not read-only is
 * destructive unless it says otherwise). Without them, a destructive verb in
 * the name, in English or Vietnamese, or warning wording in the description
 * is enough, so "delete_all_orders" is never on by default.
 */
export const isDestructiveAction = (
    action: IDestructiveActionInput
): boolean => {
    if (action.destructive !== undefined) return action.destructive;
    const hints = action.annotations;
    if (hints?.destructiveHint !== undefined) return hints.destructiveHint;
    if (hints?.readOnlyHint === true) return false;
    if (hints?.readOnlyHint === false) return true;
    return (
        words(action.name).some(
            word => isWordVerb(word) || hasStrongVerb(word)
        ) || WARNING_WORDING.test(plain(action.description ?? ''))
    );
};
