import type { McpServer } from "@modelcontextprotocol/server";
import {
  analyticsClientControllerBotV1,
  analyticsClientControllerConversionV1,
  analyticsClientControllerCustomersV1,
  analyticsClientControllerMarketingV1,
} from "@repo/client";
import * as z from "zod";
import { type Allows, type ApiOptions, READS, respond } from "./shared";

const period = z.object({
  range: z
    .enum(["7d", "30d", "90d"])
    .optional()
    .describe(
      "The last 7, 30 or 90 days, compared with the period before. Default 30d.",
    ),
  timezone: z
    .string()
    .optional()
    .describe(
      "IANA timezone for day boundaries, such as Asia/Ho_Chi_Minh (the default).",
    ),
});

// Shared by every analytics tool, so the agent can plan its calls.
const NOTE =
  " Numbers are cached for 10 minutes. All analytics tools share 20 calls a minute per API key: reuse a result instead of asking again.";

// The dashboard tabs, each behind the abilities of its workspace route.
export function registerAnalyticsTools(
  server: McpServer,
  api: ApiOptions,
  allows: Allows,
) {
  const customers = allows("CUSTOMER", "read");
  const chatbots = allows("CHATBOT", "read");

  if (customers) {
    server.registerTool(
      "get_conversion_analytics",
      {
        title: "Get conversion analytics",
        description:
          "New customers, engaged customers, hot leads and orders per day and per channel, the conversion rate against the previous period, and the median hours to a first order." +
          NOTE,
        inputSchema: period,
        annotations: READS,
      },
      (query) =>
        respond(
          analyticsClientControllerConversionV1({ ...api, query }),
          (d) => d.data,
        ),
    );
    server.registerTool(
      "get_customer_analytics",
      {
        title: "Get customer analytics",
        description:
          "Customers by tag (and how many have none), new and returning customers per day, and customers per channel." +
          NOTE,
        inputSchema: period,
        annotations: READS,
      },
      (query) =>
        respond(
          analyticsClientControllerCustomersV1({ ...api, query }),
          (d) => d.data,
        ),
    );
  }

  if (chatbots) {
    server.registerTool(
      "get_bot_analytics",
      {
        title: "Get chatbot analytics",
        description:
          "How the chatbots perform: conversations resolved by the bot or handed to staff per day, the handoff rate against the previous period, handoff reasons, and per chatbot its handoff rate, first reply time and tool error rate." +
          NOTE,
        inputSchema: period,
        annotations: READS,
      },
      (query) =>
        respond(
          analyticsClientControllerBotV1({ ...api, query }),
          (d) => d.data,
        ),
    );
  }

  if (customers && chatbots) {
    server.registerTool(
      "get_marketing_analytics",
      {
        title: "Get sentiment analytics",
        description:
          "Customer sentiment from conversation tags: positive, negative and complaint per day and per channel, the positive rate against the previous period, and the latest unhappy customers." +
          NOTE,
        inputSchema: period,
        annotations: READS,
      },
      (query) =>
        respond(
          analyticsClientControllerMarketingV1({ ...api, query }),
          (d) => d.data,
        ),
    );
  }
}
