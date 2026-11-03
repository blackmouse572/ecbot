type ActionLike = {
  name: string;
  description?: string;
  inputSchema?: unknown;
  destructive?: boolean;
};

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
  actions.flatMap((a) => (a.destructive ? [] : [a.name]));

/**
 * Rough tokens the enabled actions add to every model call: each action's
 * name, description and input schema are sent with the prompt. About four
 * characters a token, close enough to tell a 2k tool from a 70k one.
 */
export const enabledActionsPromptTokens = (
  actions: ActionLike[],
  enabledActions: string[] | null,
): number =>
  actions
    .filter((action) => isActionEnabled(action, enabledActions))
    .reduce(
      (sum, { name, description, inputSchema }) =>
        sum +
        Math.ceil(
          JSON.stringify({ name, description, inputSchema }).length / 4,
        ),
      0,
    );
