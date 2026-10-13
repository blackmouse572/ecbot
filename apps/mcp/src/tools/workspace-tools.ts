import type { McpServer } from "@modelcontextprotocol/server";
import {
  chatbotToolClientControllerDisableV1,
  chatbotToolClientControllerEnableV1,
  chatbotToolClientControllerListV1,
  toolClientControllerCreateHttpV1,
  toolClientControllerCreateMcpV1,
  toolClientControllerDeleteV1,
  toolClientControllerGetV1,
  toolClientControllerListV1,
  toolClientControllerUpdateV1,
} from "@repo/client";
import * as z from "zod";
import {
  ADDS,
  type Allows,
  type ApiOptions,
  DELETES,
  OVERWRITES,
  READS,
  SWITCHES,
  paging,
  respond,
} from "./shared";

// A workspace Tool is an action a chatbot can call while it talks to
// customers: an HTTP endpoint or an MCP server. "workspace" in the names
// keeps them apart from this server's own MCP tools.

const httpAuth = z
  .object({
    type: z.enum(["bearer", "api_key", "basic", "none"]),
    placement: z.enum(["header", "query"]).optional(),
    paramName: z
      .string()
      .optional()
      .describe("Header or query parameter name for an api_key."),
  })
  .optional();

const httpFields = {
  description: z
    .string()
    .describe(
      "What it does: the chatbot reads this to decide when to call it.",
    ),
  inputSchema: z
    .record(z.string(), z.unknown())
    .describe("JSON Schema of the arguments the chatbot passes."),
  headers: z.record(z.string(), z.string()).optional(),
  auth: httpAuth,
  credential: z
    .string()
    .optional()
    .describe("The secret for auth (token, API key, or user:password)."),
  timeoutMs: z.number().int().optional(),
  maxRetries: z.number().int().optional(),
};

export function registerWorkspaceToolTools(
  server: McpServer,
  api: ApiOptions,
  allows: Allows,
) {
  if (allows("TOOL", "read")) registerReadTools(server, api);
  if (allows("TOOL", "create")) registerCreateTools(server, api);
  if (allows("TOOL", "update")) registerUpdateTools(server, api);
  if (allows("TOOL", "delete")) registerDeleteTools(server, api);
}

function registerReadTools(server: McpServer, api: ApiOptions) {
  server.registerTool(
    "list_workspace_tools",
    {
      title: "List workspace tools",
      description:
        "List the workspace's Tools: actions its chatbots can call while talking to customers, each an HTTP endpoint or an MCP server.",
      inputSchema: z.object({
        search: z.string().optional(),
        kind: z.string().optional().describe("Comma-separated: HTTP, MCP."),
        status: z
          .string()
          .optional()
          .describe("Comma-separated: ACTIVE, NEEDS_REAUTH, EXPIRED, REVOKED."),
        ...paging,
      }),
      annotations: READS,
    },
    (query) =>
      respond(toolClientControllerListV1({ ...api, query }), (d) => ({
        tools: d.data,
        pagination: d._metadata.pagination,
      })),
  );

  server.registerTool(
    "get_workspace_tool",
    {
      title: "Get workspace tool",
      description: "Get a workspace Tool and the actions it offers.",
      inputSchema: z.object({ toolId: z.string() }),
      annotations: READS,
    },
    ({ toolId }) =>
      respond(
        toolClientControllerGetV1({ ...api, path: { toolId } }),
        (d) => d.data,
      ),
  );

  server.registerTool(
    "list_chatbot_tools",
    {
      title: "List a chatbot's tools",
      description: "List the workspace Tools a chatbot can call.",
      inputSchema: z.object({ chatbotId: z.string() }),
      annotations: READS,
    },
    ({ chatbotId }) =>
      respond(
        chatbotToolClientControllerListV1({ ...api, path: { chatbotId } }),
        (d) => d.data,
      ),
  );
}

function registerCreateTools(server: McpServer, api: ApiOptions) {
  server.registerTool(
    "create_http_tool",
    {
      title: "Create HTTP tool",
      description:
        "Create a workspace Tool that calls one of the business's HTTP endpoints. Then let a chatbot use it with enable_chatbot_tool.",
      inputSchema: z.object({
        name: z.string().describe("Short snake_case name, e.g. lookup_order."),
        httpMethod: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
        httpUrl: z
          .string()
          .describe("The endpoint URL; {arg} placeholders take arguments."),
        ...httpFields,
      }),
      annotations: ADDS,
    },
    (body) =>
      respond(
        toolClientControllerCreateHttpV1({ ...api, body }),
        (d) => d.data,
      ),
  );

  server.registerTool(
    "create_mcp_tool",
    {
      title: "Create MCP tool",
      description:
        "Connect an MCP server as a workspace Tool; its actions are discovered on connect. Then let a chatbot use it with enable_chatbot_tool.",
      inputSchema: z.object({
        name: z.string(),
        description: z.string(),
        serverUrl: z.string().describe("The MCP server's HTTP URL."),
        auth: z
          .object({
            type: z.enum(["bearer", "api_key", "none"]),
            placement: z.enum(["header"]).optional(),
            paramName: z.string().optional(),
          })
          .optional(),
        credential: z.string().optional(),
      }),
      annotations: ADDS,
    },
    (body) =>
      respond(toolClientControllerCreateMcpV1({ ...api, body }), (d) => d.data),
  );
}

function registerUpdateTools(server: McpServer, api: ApiOptions) {
  server.registerTool(
    "update_workspace_tool",
    {
      title: "Update workspace tool",
      description:
        "Change a workspace Tool's settings. Only the fields you send change.",
      inputSchema: z.object({
        toolId: z.string(),
        name: z.string().optional(),
        ...z.object(httpFields).partial().shape,
      }),
      annotations: OVERWRITES,
    },
    ({ toolId, ...body }) =>
      respond(
        toolClientControllerUpdateV1({ ...api, path: { toolId }, body }),
        (d) => d.data,
      ),
  );

  server.registerTool(
    "enable_chatbot_tool",
    {
      title: "Let a chatbot use a tool",
      description:
        "Let a chatbot call a workspace Tool while it talks to customers.",
      inputSchema: z.object({
        chatbotId: z.string(),
        toolId: z.string(),
        enabledActions: z
          .array(z.string())
          .optional()
          .describe(
            "For an MCP tool, only these of its actions; all if left out.",
          ),
      }),
      annotations: SWITCHES,
    },
    ({ chatbotId, toolId, ...body }) =>
      respond(
        chatbotToolClientControllerEnableV1({
          ...api,
          path: { chatbotId, toolId },
          body,
        }),
        (d) => d.data,
      ),
  );

  server.registerTool(
    "disable_chatbot_tool",
    {
      title: "Stop a chatbot using a tool",
      description: "Stop a chatbot calling a workspace Tool.",
      inputSchema: z.object({ chatbotId: z.string(), toolId: z.string() }),
      annotations: SWITCHES,
    },
    ({ chatbotId, toolId }) =>
      respond(
        chatbotToolClientControllerDisableV1({
          ...api,
          path: { chatbotId, toolId },
        }),
        (d) => d.data,
      ),
  );
}

function registerDeleteTools(server: McpServer, api: ApiOptions) {
  server.registerTool(
    "delete_workspace_tool",
    {
      title: "Delete workspace tool",
      description:
        "Delete a workspace Tool. Chatbots that used it can no longer call it.",
      inputSchema: z.object({ toolId: z.string() }),
      annotations: DELETES,
    },
    ({ toolId }) =>
      respond(
        toolClientControllerDeleteV1({ ...api, path: { toolId } }),
        (d) => d.data,
      ),
  );
}
