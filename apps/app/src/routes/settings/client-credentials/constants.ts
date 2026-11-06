/** The hosted Ecbot MCP Server (apps/mcp). */
export const MCP_SERVER_URL = "https://mcp.ecbot.dev/mcp";

/** The JSON a client such as Cursor's mcp.json takes, with the key filled in. */
export const mcpConfigSnippet = (apiKey: string) =>
  JSON.stringify(
    {
      mcpServers: {
        ecbot: { url: MCP_SERVER_URL, headers: { "x-api-key": apiKey } },
      },
    },
    null,
    2,
  );
