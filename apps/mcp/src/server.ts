import { McpServer } from "@modelcontextprotocol/server";
import { clientCredentialClientControllerMeV1 } from "@repo/client";
import { env } from "./env";
import { registerAnalyticsTools } from "./tools/analytics";
import { registerChatbotTools } from "./tools/chatbots";
import { registerConversationTools } from "./tools/conversations";
import { registerCustomerTools } from "./tools/customers";
import { registerKnowledgeTools } from "./tools/knowledge";
import { registerSkillTools } from "./tools/skills";
import { registerWorkspaceToolTools } from "./tools/workspace-tools";
import type { Allows, ApiOptions } from "./tools/shared";

// One server per request, bound to the caller's key. The key travels with
// each API call instead of living on the shared @repo/client instance, so
// concurrent requests in one isolate can't pick up each other's key.
//
// A tools/list asks the API once what the key may do and lists only those
// tools. Any other request registers every tool and skips the lookup: the
// API checks each call anyway.
export async function createEcbotServer(
  apiKey: string,
  listingTools: boolean,
): Promise<McpServer> {
  // Declared up front so a key that may use no tool gets an empty list, not
  // "Method not found".
  const server = new McpServer(
    { name: "ecbot", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );
  // Workers have fetch but not XMLHttpRequest, axios's browser default, and
  // workerd rejects the `cache: 'default'` axios's fetch adapter sets.
  const api: ApiOptions = {
    auth: apiKey,
    baseURL: env.SERVER_URL,
    adapter: "fetch",
    fetchOptions: { cache: "no-store" },
  };

  const permissions = listingTools ? await findPermissions(api) : undefined;
  const allows: Allows = (subject, action) =>
    !permissions ||
    permissions.some((p) => p.subject === subject && p.action.includes(action));

  registerChatbotTools(server, api, allows);
  registerKnowledgeTools(server, api, allows);
  registerConversationTools(server, api, allows);
  registerCustomerTools(server, api, allows);
  registerWorkspaceToolTools(server, api, allows);
  registerSkillTools(server, api, allows);
  registerAnalyticsTools(server, api, allows);

  return server;
}

// Undefined when the API can't say (a wrong key, an outage): every tool is
// then listed, and each call reports the API's own error.
async function findPermissions(api: ApiOptions) {
  const { data } = await clientCredentialClientControllerMeV1(api);
  return data?.data?.permissions;
}
