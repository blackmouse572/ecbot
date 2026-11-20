import type { ToolListResponseDto } from "@repo/client";
import { describe, expect, it } from "vitest";
import { toolSource } from "./tool-source";

// SAFETY: toolSource reads only kind, mcpProvider and the two URLs.
const tool = (fields: Partial<ToolListResponseDto>) =>
  ({ kind: "MCP", ...fields }) as ToolListResponseDto;

describe("toolSource", () => {
  it("calls a store install ready-made, with no host", () => {
    expect(toolSource(tool({ mcpProvider: "COMPOSIO" }))).toEqual({
      ready: true,
    });
    expect(toolSource(tool({ mcpProvider: "ECCHO" }))).toEqual({
      ready: true,
    });
  });

  it("names the host of a self-configured HTTP tool", () => {
    expect(
      toolSource(
        tool({ kind: "HTTP", httpUrl: "https://api.shop.vn/v1/orders?x=1" }),
      ),
    ).toEqual({ ready: false, host: "api.shop.vn" });
  });

  it("names the host of a self-configured MCP server", () => {
    expect(
      toolSource(
        tool({ mcpProvider: "OPERATOR", mcpServerUrl: "https://mcp.shop.vn/" }),
      ),
    ).toEqual({ ready: false, host: "mcp.shop.vn" });
  });

  it("leaves the host out when the URL does not parse", () => {
    expect(toolSource(tool({ kind: "HTTP", httpUrl: "not a url" }))).toEqual({
      ready: false,
    });
  });
});
