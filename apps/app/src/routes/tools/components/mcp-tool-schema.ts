import { z } from "zod/v4";

const mcpAuthSchema = z
  .object({
    type: z.enum(["bearer", "api_key", "none"]),
    placement: z.enum(["header"]).optional(),
    paramName: z.string().optional(),
  })
  .optional();

export const createMcpToolSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().min(1),
  serverUrl: z.url(),
  auth: mcpAuthSchema,
  credential: z.string().optional(),
});

export type McpToolFormData = z.infer<typeof createMcpToolSchema>;

export const MCP_AUTH_TYPES = ["none", "bearer", "api_key"] as const;
export const MCP_AUTH_PLACEMENTS = ["header"] as const;
