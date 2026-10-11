import type { ToolResponseDto } from "@repo/client";
import { schemaToRows } from "./json-schema-editor";
import type { HttpToolFormData } from "./http-tool-schema";
import type { McpToolFormData } from "./mcp-tool-schema";

/**
 * The edit form starts from what is saved, so a save never quietly resets the
 * auth or headers. The credential is write-only: empty keeps the stored one.
 */
export const httpToolEditValues = (
  tool: ToolResponseDto,
): Partial<HttpToolFormData> => {
  const loadedSchema = tool.httpInputSchema as
    Record<string, unknown> | undefined;
  return {
    name: tool.name,
    description: tool.description,
    httpMethod: (tool.httpMethod as HttpToolFormData["httpMethod"]) ?? "GET",
    httpUrl: tool.httpUrl ?? "",
    // schemaToRows returns null for schemas the structured editor cannot
    // represent (nested objects, oneOf, …). Fall back to empty rows; the
    // JSON-mode editor still lets the user see/edit the raw schema.
    inputSchemaRows: (loadedSchema ? schemaToRows(loadedSchema) : null) ?? [],
    headers: tool.httpHeaders,
    auth: (tool.httpAuth as HttpToolFormData["auth"]) ?? { type: "none" },
    credential: "",
    timeoutMs: tool.timeoutMs,
    maxRetries: tool.maxRetries,
  };
};

export const mcpToolEditValues = (tool: ToolResponseDto): McpToolFormData => ({
  name: tool.name,
  description: tool.description,
  serverUrl: tool.mcpServerUrl ?? "",
  auth: (tool.mcpAuth as McpToolFormData["auth"]) ?? { type: "none" },
  credential: "",
});
