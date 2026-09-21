import type { CreateMcpToolRequestDto } from "@repo/client";
import type { McpToolFormData } from "./mcp-tool-schema";

export const toCreateMcpPayload = (
  data: McpToolFormData,
): CreateMcpToolRequestDto => {
  return {
    name: data.name,
    description: data.description,
    serverUrl: data.serverUrl,
    auth: data.auth,
    credential: data.credential ? data.credential : undefined,
  };
};
