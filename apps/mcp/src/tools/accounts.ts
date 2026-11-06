import type { McpServer } from "@modelcontextprotocol/server";
import {
  accountClientControllerConnectLinkV1,
  accountClientControllerConnectTelegramV1,
  accountClientControllerCreateApiChannelV1,
  accountClientControllerCreateWebsiteWidgetV1,
  accountClientControllerGetV1,
  accountClientControllerListV1,
  chatbotClientControllerLinkAccountsV1,
  chatbotClientControllerUnlinkAccountsV1,
} from "@repo/client";
import * as z from "zod";
import {
  type Allows,
  type ApiOptions,
  ADDS,
  READS,
  SWITCHES,
  paging,
  respond,
} from "./shared";

// Accounts: the channels a workspace has connected (Facebook Page, Zalo OA,
// Telegram bot, website widget, API channel, ...).
export function registerAccountTools(
  server: McpServer,
  api: ApiOptions,
  allows: Allows,
) {
  if (allows("ACCOUNT", "read")) registerReadTools(server, api);
  if (allows("ACCOUNT", "create")) registerCreateTools(server, api);
  // Putting a chatbot on a channel changes the chatbot, as in the app.
  if (allows("CHATBOT", "update")) registerAssignTools(server, api);
}

function registerReadTools(server: McpServer, api: ApiOptions) {
  server.registerTool(
    "list_accounts",
    {
      title: "List channels",
      description:
        "List the channels (Accounts) connected to the workspace, with the chatbot each one runs. A Facebook login and its Pages are separate Accounts; filter by `account` to list a login's Pages.",
      inputSchema: z.object({
        search: z.string().optional().describe("Match on the channel name."),
        type: z
          .enum([
            "FACEBOOK_ACCOUNT",
            "FACEBOOK_PAGE",
            "INSTAGRAM_ACCOUNT",
            "ZALO_ACCOUNT",
            "ZALO_PAGE",
            "TELEGRAM_BOT",
            "WHATSAPP_BUSINESS",
            "THREADS_ACCOUNT",
            "WEBSITE_WIDGET",
            "API_CHANNEL",
          ])
          .optional(),
        status: z.enum(["ACTIVE", "INACTIVE", "BLOCKED"]).optional(),
        account: z.string().optional().describe("Parent Account ID."),
        ...paging,
      }),
      annotations: READS,
    },
    (query) =>
      respond(accountClientControllerListV1({ ...api, query }), (d) => ({
        accounts: d.data,
        pagination: d._metadata.pagination,
      })),
  );

  server.registerTool(
    "get_account",
    {
      title: "Get channel",
      description: "Get a connected channel (Account) by its ID.",
      inputSchema: z.object({ id: z.string() }),
      annotations: READS,
    },
    ({ id }) =>
      respond(
        accountClientControllerGetV1({ ...api, path: { id } }),
        (d) => d.data,
      ),
  );
}

function registerCreateTools(server: McpServer, api: ApiOptions) {
  server.registerTool(
    "create_api_channel",
    {
      title: "Create API channel",
      description:
        "Create an API channel: your own system sends customer messages to Ecbot over REST and gets the replies at callbackUrl. Returns accountKey and the signing secret, which is shown only this once: tell the user to store it.",
      inputSchema: z.object({
        name: z.string().min(1).max(255),
        callbackUrl: z
          .string()
          .url()
          .describe("HTTPS URL the chatbot's replies are POSTed to."),
      }),
      annotations: ADDS,
    },
    (body) =>
      respond(
        accountClientControllerCreateApiChannelV1({ ...api, body }),
        (d) => d.data,
      ),
  );

  server.registerTool(
    "create_website_widget",
    {
      title: "Create website widget",
      description:
        "Create a chat widget for a website. Returns widgetKey; the embed snippet is on the channel's page in the Ecbot app.",
      inputSchema: z.object({
        name: z.string().min(1).max(255),
        allowedOrigins: z
          .array(z.string().url())
          .min(1)
          .describe("Sites allowed to show the widget, e.g. https://shop.vn."),
      }),
      annotations: ADDS,
    },
    (body) =>
      respond(
        accountClientControllerCreateWebsiteWidgetV1({ ...api, body }),
        (d) => d.data,
      ),
  );

  server.registerTool(
    "connect_telegram_bot",
    {
      title: "Connect Telegram bot",
      description:
        "Connect a Telegram bot from the token BotFather gave. The token is a secret: only pass one the user gave you for this.",
      inputSchema: z.object({ botToken: z.string().min(1).max(200) }),
      annotations: ADDS,
    },
    (body) =>
      respond(
        accountClientControllerConnectTelegramV1({ ...api, body }),
        (d) => d.data,
      ),
  );

  server.registerTool(
    "get_channel_connect_link",
    {
      title: "Get channel connect link",
      description:
        "Facebook, Instagram, Zalo, WhatsApp and Threads need the user to sign in on that platform in a browser, which you cannot do. This returns a link to the Ecbot app's connect page with the platform picked: give it to the user, then check list_accounts once they say they are done. FACEBOOK_ACCOUNT connects the Facebook Pages of a login.",
      inputSchema: z.object({
        platform: z.enum([
          "FACEBOOK_ACCOUNT",
          "INSTAGRAM_ACCOUNT",
          "ZALO_ACCOUNT",
          "WHATSAPP_BUSINESS",
          "THREADS_ACCOUNT",
        ]),
      }),
      annotations: READS,
    },
    (query) =>
      respond(
        accountClientControllerConnectLinkV1({ ...api, query }),
        (d) => d.data,
      ),
  );
}

function registerAssignTools(server: McpServer, api: ApiOptions) {
  server.registerTool(
    "link_account_to_chatbot",
    {
      title: "Put chatbot on channels",
      description:
        "Make a chatbot answer on connected channels (Accounts). A channel already on another chatbot is not moved: it comes back under skipped.",
      inputSchema: z.object({
        chatbotId: z.string(),
        accountIds: z.array(z.string()).min(1),
      }),
      annotations: SWITCHES,
    },
    ({ chatbotId, accountIds }) =>
      respond(
        chatbotClientControllerLinkAccountsV1({
          ...api,
          path: { id: chatbotId },
          body: { accounts: accountIds },
        }),
        (d) => d.data,
      ),
  );

  server.registerTool(
    "unlink_account_from_chatbot",
    {
      title: "Take chatbot off channels",
      description:
        "Stop a chatbot answering on connected channels (Accounts). The channels stay connected.",
      inputSchema: z.object({
        chatbotId: z.string(),
        accountIds: z.array(z.string()).min(1),
      }),
      annotations: SWITCHES,
    },
    ({ chatbotId, accountIds }) =>
      respond(
        chatbotClientControllerUnlinkAccountsV1({
          ...api,
          path: { id: chatbotId },
          body: { accounts: accountIds },
        }),
        (d) => d.data,
      ),
  );
}
