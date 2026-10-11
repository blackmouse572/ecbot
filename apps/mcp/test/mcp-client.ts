import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
import { app } from "../src/index";

// A real MCP client, talking to the worker through app.request instead of
// the network, so every test runs the actual protocol exchange.
export async function connect(headers: Record<string, string>) {
  const client = new Client({ name: "test", version: "1.0.0" });
  await client.connect(
    new StreamableHTTPClientTransport(new URL("http://mcp.test/mcp"), {
      fetch: async (url, init) => app.request(url.toString(), init),
      requestInit: { headers },
    }),
  );
  return client;
}

export function textOf(
  result: Awaited<ReturnType<Client["callTool"]>>,
): string {
  const [block] = result.content as { type: string; text: string }[];
  return block.text;
}
