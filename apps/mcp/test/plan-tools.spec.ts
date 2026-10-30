import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/client");

import * as api from "@repo/client";
import { env } from "../src/env";
import { connect, textOf } from "./mcp-client";

const KEY = "client-key:client-secret";

describe("get_plan_usage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // The route lives in the Ecbot Cloud overlay, so @repo/client has no
  // function for it and the tool calls it by path.
  it("returns the plan card with the caller's key", async () => {
    const card = { planName: "Pilot", usedPercent: 20, hasCredit: false };
    vi.mocked(api.client.get).mockResolvedValue({
      data: { data: card },
    } as never);
    const client = await connect({ "x-api-key": KEY });

    const output = await client.callTool({
      name: "get_plan_usage",
      arguments: {},
    });

    expect(api.client.get).toHaveBeenCalledWith(
      expect.objectContaining({
        auth: KEY,
        url: "/api/v1/client/token-usage/summary",
      }),
    );
    expect(output.isError).toBeFalsy();
    expect(JSON.parse(textOf(output))).toEqual(card);
  });

  // An open-edition API has no such route and answers 404.
  it("returns an API error as a tool error", async () => {
    vi.mocked(api.client.get).mockResolvedValue({
      error: { message: "Cannot GET /api/v1/client/token-usage/summary" },
    } as never);
    const client = await connect({ "x-api-key": KEY });

    const output = await client.callTool({
      name: "get_plan_usage",
      arguments: {},
    });

    expect(output.isError).toBe(true);
    expect(textOf(output)).toBe(
      "Cannot GET /api/v1/client/token-usage/summary",
    );
  });

  it("is listed only for keys that may read token usage", async () => {
    vi.mocked(api.clientCredentialClientControllerMeV1).mockResolvedValue({
      data: {
        data: { permissions: [{ subject: "CHATBOT", action: ["read"] }] },
      },
    } as never);
    const client = await connect({ "x-api-key": KEY });

    const { tools } = await client.listTools();

    expect(tools.map((t) => t.name)).not.toContain("get_plan_usage");
  });

  // Billing comes with the enterprise overlay, whose wrangler.json sets
  // ECCHO_EDITION. A self-hosted worker never lists the tool.
  it("is not listed on the open edition", async () => {
    vi.mocked(api.clientCredentialClientControllerMeV1).mockResolvedValue({
      data: {
        data: { permissions: [{ subject: "TOKEN_USAGE", action: ["read"] }] },
      },
    } as never);
    env.ECCHO_EDITION = undefined;
    try {
      const client = await connect({ "x-api-key": KEY });

      const { tools } = await client.listTools();

      expect(tools.map((t) => t.name)).not.toContain("get_plan_usage");
    } finally {
      env.ECCHO_EDITION = "enterprise";
    }
  });
});
