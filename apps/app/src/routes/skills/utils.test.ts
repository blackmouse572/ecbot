import type { ToolListResponseDto } from "@repo/client";
import { describe, expect, it } from "vitest";
import { toolNameOf } from "./utils";

describe("toolNameOf", () => {
  const tools = [
    { id: "h", kind: "HTTP", slug: "lookup order" },
    { id: "m", kind: "MCP", slug: "zendesk" },
  ] as ToolListResponseDto[];

  it("names tools the way the agent calls them", () => {
    const name = toolNameOf(tools);
    expect(name({ toolId: "h" })).toBe("lookup_order");
    expect(name({ toolId: "m", action: "create.ticket" })).toBe(
      "create_ticket",
    );
    expect(name({ toolId: "m" })).toBeUndefined();
    expect(name({ toolId: "gone" })).toBeUndefined();
  });
});
