import { describe, expect, it } from "vitest";
import { toUpdateHttpPayload } from "./http-tool-payload";
import { toUpdateMcpPayload } from "./mcp-tool-payload";
import {
  httpToolEditValues,
  mcpToolEditValues,
  needsCredentialAgain,
} from "./tool-edit-values";

// #176: editing a tool could only change its name and description, and the
// HTTP form reset auth to "none" on every save.
describe("tool edit values", () => {
  it("starts the HTTP form from the saved method, URL, headers and auth", () => {
    const values = httpToolEditValues({
      name: "Orders",
      description: "Look up an order",
      httpMethod: "POST",
      httpUrl: "https://api.example.com/orders",
      httpHeaders: { "X-Shop": "kunmart" },
      httpAuth: { type: "api_key", placement: "query", paramName: "key" },
      timeoutMs: 5000,
      maxRetries: 2,
    } as never);

    expect(values).toMatchObject({
      httpMethod: "POST",
      httpUrl: "https://api.example.com/orders",
      headers: { "X-Shop": "kunmart" },
      auth: { type: "api_key", placement: "query", paramName: "key" },
      credential: "",
    });
  });

  it("sends the new HTTP method and URL on save", () => {
    const payload = toUpdateHttpPayload({
      name: "Orders",
      description: "d",
      httpMethod: "GET",
      httpUrl: "https://api.example.com/v2/orders",
      inputSchemaRows: [],
      auth: { type: "none" },
      credential: "",
    } as never);

    expect(payload).toMatchObject({
      httpMethod: "GET",
      httpUrl: "https://api.example.com/v2/orders",
    });
    expect(payload.credential).toBeUndefined();
  });

  it("starts the MCP form from the saved server and sends a new credential only when typed", () => {
    expect(
      mcpToolEditValues({
        name: "Shop MCP",
        description: "d",
        mcpServerUrl: "https://mcp.example.com/sse",
        mcpAuth: { type: "bearer" },
      } as never),
    ).toEqual({
      name: "Shop MCP",
      description: "d",
      serverUrl: "https://mcp.example.com/sse",
      auth: { type: "bearer" },
      credential: "",
    });

    expect(
      toUpdateMcpPayload({
        name: "Shop MCP",
        description: "d",
        serverUrl: "https://mcp.example.com/v2",
        auth: { type: "bearer" },
        credential: "",
      }),
    ).toEqual({
      name: "Shop MCP",
      description: "d",
      serverUrl: "https://mcp.example.com/v2",
      auth: { type: "bearer" },
      credential: undefined,
    });
  });

  // #247 review: a stored key must not follow the URL to another server.
  it("asks for the credential again when the URL moves to another origin", () => {
    const saved = "https://api.shop.vn/orders";
    expect(
      needsCredentialAgain(saved, "https://evil.example/x", "bearer", ""),
    ).toBe(true);
    expect(
      needsCredentialAgain(saved, "https://api.shop.vn/v2", "bearer", ""),
    ).toBe(false);
    expect(
      needsCredentialAgain(saved, "https://evil.example/x", "bearer", "new"),
    ).toBe(false);
    expect(
      needsCredentialAgain(saved, "https://evil.example/x", "none", ""),
    ).toBe(false);
    expect(needsCredentialAgain(saved, "not a url", "bearer", "")).toBe(false);
  });
});
