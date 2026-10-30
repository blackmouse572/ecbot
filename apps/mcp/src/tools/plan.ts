import type { McpServer } from "@modelcontextprotocol/server";
import { client } from "@repo/client";
import * as z from "zod";
import { type Allows, type ApiOptions, READS, respond } from "./shared";

// The plan card is billing, which only Ecbot Cloud has: the route comes with
// the enterprise overlay, so @repo/client has no function for it. On an
// open-edition API the call fails with the API's own "not found".
export function registerPlanTools(
  server: McpServer,
  api: ApiOptions,
  allows: Allows,
) {
  if (!allows("TOKEN_USAGE", "read")) return;

  server.registerTool(
    "get_plan_usage",
    {
      title: "Get plan and token usage",
      description:
        "The workspace's plan, its status, the percent of this period's token quota used, when the period renews, whether top-up credit is left beyond the quota, and roughly how many replies the whole quota covers on each model the workspace uses. Ecbot Cloud only.",
      inputSchema: z.object({}),
      annotations: READS,
    },
    () =>
      respond(
        client.get<{ 200: { data: unknown } }>({
          ...api,
          security: [{ name: "x-api-key", type: "apiKey" }],
          url: "/api/v1/client/token-usage/summary",
        }),
        (d) => d.data,
      ),
  );
}
