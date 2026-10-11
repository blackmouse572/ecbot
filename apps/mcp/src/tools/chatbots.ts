import type { McpServer } from "@modelcontextprotocol/server";
import {
  chatbotClientControllerFindAllV1,
  chatbotClientControllerFindOneV1,
} from "@repo/client";
import * as z from "zod";
import { type Allows, type ApiOptions, paging, respond } from "./shared";

export function registerChatbotTools(
  server: McpServer,
  api: ApiOptions,
  allows: Allows,
) {
  if (!allows("CHATBOT", "read")) return;

  server.registerTool(
    "list_chatbots",
    {
      title: "List chatbots",
      description:
        "List the chatbots in the Ecbot workspace this API key belongs to.",
      inputSchema: z.object({
        search: z.string().optional().describe("Match on the chatbot name."),
        status: z
          .string()
          .optional()
          .describe("Comma-separated statuses, e.g. active,inactive."),
        type: z.string().optional().describe("Comma-separated chatbot types."),
        ...paging,
      }),
      annotations: { readOnlyHint: true },
    },
    (query) =>
      respond(chatbotClientControllerFindAllV1({ ...api, query }), (d) => ({
        chatbots: d.data,
        pagination: d._metadata.pagination,
      })),
  );

  server.registerTool(
    "get_chatbot",
    {
      title: "Get chatbot",
      description:
        "Get a chatbot's configuration and shop knowledge by its ID.",
      inputSchema: z.object({ id: z.string() }),
      annotations: { readOnlyHint: true },
    },
    ({ id }) =>
      respond(
        chatbotClientControllerFindOneV1({ ...api, path: { id } }),
        (d) => d.data,
      ),
  );
}
