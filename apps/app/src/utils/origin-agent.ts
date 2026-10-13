/**
 * Query param a create page reads to know it was opened from an agent's
 * detail page: the new item is attached to that agent and the user is sent
 * back there once it is created.
 */
export const ORIGIN_AGENT_PARAM = "agent";

/** Appends the originating agent to a create-page path. */
export const withOriginAgent = (path: string, agentId: string) =>
  `${path}?${new URLSearchParams({ [ORIGIN_AGENT_PARAM]: agentId })}`;
