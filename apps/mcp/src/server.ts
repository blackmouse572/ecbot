import { McpServer } from "@modelcontextprotocol/server";
import { env } from "./env";
import { registerChatbotTools } from "./tools/chatbots";
import { registerConversationTools } from "./tools/conversations";
import { registerCustomerTools } from "./tools/customers";
import { registerKnowledgeTools } from "./tools/knowledge";
import type { ApiOptions } from "./tools/shared";

// One server per request, bound to the caller's key. The key travels with
// each API call instead of living on the shared @repo/client instance, so
// concurrent requests in one isolate can't pick up each other's key.
export function createEcbotServer(apiKey: string): McpServer {
  const server = new McpServer({ name: "ecbot", version: "0.1.0" });
  // Workers have fetch but not XMLHttpRequest, axios's browser default, and
  // workerd rejects the `cache: 'default'` axios's fetch adapter sets.
  const api: ApiOptions = {
    auth: apiKey,
    baseURL: env.SERVER_URL,
    adapter: "fetch",
    fetchOptions: { cache: "no-store" },
  };

  registerChatbotTools(server, api);
  registerKnowledgeTools(server, api);
  registerConversationTools(server, api);
  registerCustomerTools(server, api);

  return server;
}
