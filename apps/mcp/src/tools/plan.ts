import type { McpServer } from "@modelcontextprotocol/server";
import { client } from "@repo/client";
import * as z from "zod";
import { env } from "../env";
import { type Allows, type ApiOptions, READS, respond } from "./shared";

// The plan card is billing, which only Ecbot Cloud has: the route comes with
// the enterprise overlay, so @repo/client has no function for it. Keep this
// type in sync with eccho-ee's TokenUsageSummaryResponseDto. An open-edition
// worker leaves the tool out, since its API has no such route.
export interface PlanUsageSummary {
  planName: string;
  status: string;
  usedPercent: number;
  periodEnd: string;
  hasCredit: boolean;
  lowBalanceThreshold?: number;
  estimate?: {
    referenceReplies: number;
    models: { model: string; replies: number }[];
  };
}

export function getPlanUsage(api: ApiOptions) {
  return client.get<{ 200: { data: PlanUsageSummary } }>({
    ...api,
    responseType: "json",
    security: [{ name: "x-api-key", type: "apiKey" }],
    url: "/api/v1/client/token-usage/summary",
  });
}

export function registerPlanTools(
  server: McpServer,
  api: ApiOptions,
  allows: Allows,
) {
  if (env.ECCHO_EDITION !== "enterprise" || !allows("TOKEN_USAGE", "read"))
    return;

  server.registerTool(
    "get_plan_usage",
    {
      title: "Get plan and token usage",
      description:
        "The workspace's plan, its status, the percent of this period's token quota used, when the period renews, whether top-up credit is left beyond the quota, and roughly how many replies the whole quota covers on each model the workspace uses. Ecbot Cloud only.",
      inputSchema: z.object({}),
      annotations: READS,
    },
    () => respond(getPlanUsage(api), (d) => d.data),
  );
}
