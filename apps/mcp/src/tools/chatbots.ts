import type { McpServer } from "@modelcontextprotocol/server";
import {
  type ChatbotCreateRequestDto,
  chatbotClientControllerActiveV1,
  chatbotClientControllerCreateV1,
  chatbotClientControllerDeleteV1,
  chatbotClientControllerFindAllV1,
  chatbotClientControllerFindOneV1,
  chatbotClientControllerInactiveV1,
  chatbotClientControllerModelsV1,
  chatbotClientControllerUpdateV1,
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

const CHATBOT_TYPES = [
  "beauty",
  "fashion",
  "restaurant",
  "ecommerce",
  "healthcare",
  "finance",
  "education",
  "travel",
  "spa",
  "fitness",
  "automotive",
  "real_estate",
  "entertainment",
  "cosmetics",
  "hotel",
  "home_services",
  "studio_events",
  "health_foods",
  "other",
] as const satisfies readonly ChatbotCreateRequestDto["type"][];

// What an agent sets on a chatbot. The API checks every value; language
// codes are many, so it alone validates those.
const chatbotFields = {
  name: z.string().min(1).max(100),
  type: z.enum(CHATBOT_TYPES).describe("The kind of business it serves."),
  primaryLanguage: z
    .string()
    .describe("Language code it replies in, e.g. vi or en."),
  modelTextName: z.string().describe("A model id from list_chatbot_models."),
  generalKnowledge: z
    .string()
    .max(5000)
    .optional()
    .describe(
      "What it knows about the business: products, prices, hours, policies.",
    ),
  extraInstructions: z
    .string()
    .max(5000)
    .optional()
    .describe("How it should behave, on top of its business type."),
  welcomeMessage: z.string().max(5000).optional(),
  fallbackMessage: z
    .string()
    .max(5000)
    .optional()
    .describe("What it says when it can't answer."),
  handoffMessage: z
    .string()
    .optional()
    .describe("What it says when it hands a conversation to the team."),
  handoffKeywords: z
    .array(z.string())
    .optional()
    .describe("Words that make it hand the conversation to the team."),
  accounts: z
    .array(z.string())
    .optional()
    .describe(
      "IDs of the channel accounts (Messenger page, Zalo OA, ...) it replies on. An account serves one chatbot at a time.",
    ),
};

export function registerChatbotTools(
  server: McpServer,
  api: ApiOptions,
  allows: Allows,
) {
  if (allows("CHATBOT", "read")) registerReadTools(server, api);
  if (allows("CHATBOT", "create")) registerCreateTools(server, api);
  if (allows("CHATBOT", "update")) registerUpdateTools(server, api);
}

function registerReadTools(server: McpServer, api: ApiOptions) {
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
      annotations: READS,
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
      annotations: READS,
    },
    ({ id }) =>
      respond(
        chatbotClientControllerFindOneV1({ ...api, path: { id } }),
        (d) => d.data,
      ),
  );

  server.registerTool(
    "list_chatbot_models",
    {
      title: "List chatbot models",
      description: "List the AI models a chatbot can run on.",
      inputSchema: z.object({}),
      annotations: READS,
    },
    () => respond(chatbotClientControllerModelsV1({ ...api }), (d) => d.data),
  );
}

function registerCreateTools(server: McpServer, api: ApiOptions) {
  server.registerTool(
    "create_chatbot",
    {
      title: "Create chatbot",
      description:
        "Create a chatbot. It starts active and replies on its channel accounts at once, unless status is inactive.",
      inputSchema: z.object({
        ...chatbotFields,
        status: z.enum(["active", "inactive"]).optional(),
      }),
      annotations: ADDS,
    },
    (body) =>
      respond(
        chatbotClientControllerCreateV1({
          ...api,
          // primaryLanguage is a code the API validates.
          body: body as ChatbotCreateRequestDto,
        }),
        (d) => d.data,
      ),
  );
}

function registerUpdateTools(server: McpServer, api: ApiOptions) {
  server.registerTool(
    "update_chatbot",
    {
      title: "Update chatbot",
      description:
        "Change a chatbot's settings. Only the fields you send change; accounts replaces the whole list.",
      inputSchema: z.object({
        chatbotId: z.string(),
        ...z.object(chatbotFields).partial().shape,
      }),
      annotations: OVERWRITES,
    },
    ({ chatbotId, ...body }) =>
      respond(
        chatbotClientControllerUpdateV1({
          ...api,
          path: { id: chatbotId },
          body: body as Partial<ChatbotCreateRequestDto>,
        }),
        (d) => d.data,
      ),
  );

  server.registerTool(
    "activate_chatbot",
    {
      title: "Activate chatbot",
      description:
        "Turn a chatbot on, so it replies to customers on its channel accounts.",
      inputSchema: z.object({ chatbotId: z.string() }),
      annotations: SWITCHES,
    },
    ({ chatbotId }) =>
      respond(
        chatbotClientControllerActiveV1({ ...api, path: { id: chatbotId } }),
        (d) => d.data,
      ),
  );

  server.registerTool(
    "deactivate_chatbot",
    {
      title: "Deactivate chatbot",
      description:
        "Turn a chatbot off: it stops replying to customers until activated again.",
      inputSchema: z.object({ chatbotId: z.string() }),
      annotations: SWITCHES,
    },
    ({ chatbotId }) =>
      respond(
        chatbotClientControllerInactiveV1({ ...api, path: { id: chatbotId } }),
        (d) => d.data,
      ),
  );

  // The API deletes with the update permission, as the app does.
  server.registerTool(
    "delete_chatbot",
    {
      title: "Delete chatbot",
      description:
        "Delete a chatbot. It stops replying and disappears from the workspace.",
      inputSchema: z.object({ chatbotId: z.string() }),
      annotations: DELETES,
    },
    ({ chatbotId }) =>
      respond(
        chatbotClientControllerDeleteV1({ ...api, path: { id: chatbotId } }),
        (d) => d.data,
      ),
  );
}
