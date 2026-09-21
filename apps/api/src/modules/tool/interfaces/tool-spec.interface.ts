export interface ToolSpec {
    id: string; // <toolId> for HTTP, <toolId>:<actionName> for MCP-per-action (commit #6 expands MCP)
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
}
