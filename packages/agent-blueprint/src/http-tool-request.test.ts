import { describe, expect, it } from "vitest";
import { paramInDefault, planHttpToolRequest, stripParamIn } from "./http-tool-request";

const schema = (props: Record<string, Record<string, unknown>>) => ({ type: "object", properties: props });

describe("planHttpToolRequest", () => {
  it("keeps today's routing when no parameter says where it goes", () => {
    expect(planHttpToolRequest({ method: "GET", url: "https://x.dev/p/{id}", args: { id: 1, lang: "vi" } })).toEqual({
      url: "https://x.dev/p/1",
      query: { lang: "vi" },
    });
    expect(planHttpToolRequest({ method: "POST", url: "https://x.dev/p", args: { a: 1 } })).toEqual({
      url: "https://x.dev/p",
      query: {},
      body: { a: 1 },
    });
  });

  it("sends each argument where its Send in says", () => {
    const plan = planHttpToolRequest({
      method: "POST",
      url: "https://x.dev/shops/{shop}/orders",
      inputSchema: schema({
        shop: { type: "string", "x-in": "path" },
        dry_run: { type: "boolean", "x-in": "query" },
        note: { type: "string", "x-in": "body" },
        qty: { type: "integer" },
      }),
      args: { shop: "a b", dry_run: true, note: "hi", qty: 2 },
    });
    expect(plan).toEqual({
      url: "https://x.dev/shops/a%20b/orders",
      query: { dry_run: true },
      body: { note: "hi", qty: 2 },
    });
  });

  it("sends a DELETE body only when a parameter asks for it", () => {
    const inputSchema = schema({ reason: { type: "string", "x-in": "body" } });
    expect(planHttpToolRequest({ method: "DELETE", url: "https://x.dev/o", inputSchema, args: { reason: "dup" } }).body).toEqual({
      reason: "dup",
    });
    expect(planHttpToolRequest({ method: "DELETE", url: "https://x.dev/o", args: {} }).body).toBeUndefined();
  });

  it("never sends a GET body: a Body parameter goes to the query", () => {
    const plan = planHttpToolRequest({
      method: "GET",
      url: "https://x.dev/o",
      inputSchema: schema({ q: { type: "string", "x-in": "body" } }),
      args: { q: "dress" },
    });
    expect(plan).toEqual({ url: "https://x.dev/o", query: { q: "dress" } });
  });

  it("fills a placeholder used twice, and never one in the host", () => {
    expect(planHttpToolRequest({ method: "GET", url: "https://x.dev/t/{id}/i/{id}", args: { id: 5 } }).url).toBe(
      "https://x.dev/t/5/i/5",
    );
    const plan = planHttpToolRequest({ method: "GET", url: "https://{host}/v1", args: { host: "evil.com" } });
    expect(plan.url).toBe("https://{host}/v1");
  });

  it.each([
    [{}, 'Missing argument "id"'],
    [{ id: "" }, 'Missing argument "id"'],
    [{ id: ".." }, 'cannot be ".."'],
  ])("refuses path args %j", (args, message) => {
    expect(planHttpToolRequest({ method: "GET", url: "https://x.dev/p/{id}", args }).error).toContain(message);
  });

  it("leaves out undefined and null arguments", () => {
    expect(planHttpToolRequest({ method: "POST", url: "https://x.dev", args: { a: null, b: undefined, c: 0 } }).body).toEqual({
      c: 0,
    });
  });
});

describe("paramInDefault", () => {
  it("is path when the URL path has {key}, otherwise query for GET/DELETE and body for the rest", () => {
    expect(paramInDefault("GET", "https://x.dev/p/{id}", "id")).toBe("path");
    expect(paramInDefault("GET", "https://x.dev/p", "id")).toBe("query");
    expect(paramInDefault("DELETE", "https://x.dev/p", "id")).toBe("query");
    expect(paramInDefault("PATCH", "https://x.dev/p", "id")).toBe("body");
  });
});

describe("stripParamIn", () => {
  it("removes x-in so the model only sees standard JSON Schema", () => {
    const input = schema({ id: { type: "integer", description: "Product", "x-in": "path" } });
    expect(stripParamIn(input)).toEqual(schema({ id: { type: "integer", description: "Product" } }));
    expect(input.properties.id!["x-in"]).toBe("path");
  });
});
