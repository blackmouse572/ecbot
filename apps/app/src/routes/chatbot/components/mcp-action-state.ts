type ActionLike = { name: string; destructive?: boolean };

/**
 * `null` means the link never picked actions: every action is on except the
 * destructive ones, which stay off until someone turns them on (#177).
 */
export const isActionEnabled = (
  action: ActionLike,
  enabledActions: string[] | null,
): boolean =>
  enabledActions === null
    ? !action.destructive
    : enabledActions.includes(action.name);

/** The list `null` stands for, to edit before the first toggle. */
export const defaultEnabledActions = (actions: ActionLike[]): string[] =>
  actions.filter((a) => !a.destructive).map((a) => a.name);
