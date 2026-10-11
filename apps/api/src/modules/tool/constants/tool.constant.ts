/** Auth an MCP server can receive: a bearer token or an API-key header. */
export const MCP_AUTH_TYPES: string[] = ['bearer', 'api_key', 'none'];

/** How long a connection test or discovery may take before it gives up. */
export const MCP_DISCOVERY_TIMEOUT_MS = 15_000;

/** The window the admin invocation stats cover. */
export const TOOL_INVOCATION_STATS_DAYS = 30;
