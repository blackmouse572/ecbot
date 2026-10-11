import { McpServer } from "@modelcontextprotocol/server";
import {
  chatbotClientControllerFindAllV1,
  chatbotClientControllerFindOneV1,
} from "@repo/client";
import * as z from "zod";
import { env } from "./env";

// One server per request, bound to the caller's key. The key travels with
// each API call instead of living on the shared @repo/client instance, so
// concurrent requests in one isolate can't pick up each other's key.
export function createEcbotServer(apiKey: string): McpServer {
  const server = new McpServer({ name: "ecbot", version: "0.1.0" });
  // Workers have fetch but not XMLHttpRequest, axios's browser default, and
  // workerd rejects the `cache: 'default'` axios's fetch adapter sets.
  const api = {
    auth: apiKey,
    baseURL: env.SERVER_URL,
    adapter: "fetch" as const,
    fetchOptions: { cache: "no-store" as const },
  };

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
        page: z.number().int().min(1).optional(),
        perPage: z.number().int().min(1).max(100).optional(),
      }),
      annotations: { readOnlyHint: true },
    },
    async (query) => {
      const { data, error } = await chatbotClientControllerFindAllV1({
        ...api,
        query,
      });
      if (error) return toolError(error);
      return toolResult({
        chatbots: data.data,
        pagination: data._metadata.pagination,
      });
    },
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
    async ({ id }) => {
      const { data, error } = await chatbotClientControllerFindOneV1({
        ...api,
        path: { id },
      });
      if (error) return toolError(error);
      return toolResult(data.data);
    },
  );

  return server;
}

function toolResult(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value) }] };
}

// apps/api errors carry a localized `message`; pass it on so the agent can
// tell the user what went wrong.
function toolError(error: unknown) {
  const message =
    (error as { message?: unknown }).message ?? "The Ecbot API request failed.";
  return {
    isError: true,
    content: [{ type: "text" as const, text: String(message) }],
  };
}
