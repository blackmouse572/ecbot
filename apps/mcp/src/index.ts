import {
  createMcpHandler,
  originValidationResponse,
} from "@modelcontextprotocol/server";
import { Hono } from "hono";
import { readApiKey } from "./api-key";
import { createEcbotServer } from "./server";

// The key is passed through as authInfo, unverified: apps/api checks it on
// every call, so a wrong key surfaces as a tool error from the API.
const mcp = createMcpHandler(({ authInfo }) =>
  createEcbotServer(authInfo!.token, authInfo!.extra?.listingTools === true),
);

export const app = new Hono();

app.get("/health", (c) => c.text("ok"));

app.all("/mcp", async (c) => {
  // MCP servers must validate Origin against DNS rebinding. No browser
  // origin is allowed; MCP clients send none.
  const rejected = originValidationResponse(c.req.raw, []);
  if (rejected) return rejected;

  const apiKey = readApiKey(c.req.raw.headers);
  if (!apiKey) {
    return c.json(
      {
        message:
          "Send your Ecbot API key in the x-api-key header or as a bearer token.",
      },
      401,
    );
  }

  // Peek at the JSON-RPC method: only a tools/list looks up permissions.
  const listingTools = await c.req.raw
    .clone()
    .json()
    .then(
      (body) => (body as { method?: unknown }).method === "tools/list",
      () => false,
    );

  return mcp.fetch(c.req.raw, {
    authInfo: {
      token: apiKey,
      clientId: "ecbot-client-credential",
      scopes: [],
      extra: { listingTools },
    },
  });
});

export default app;
