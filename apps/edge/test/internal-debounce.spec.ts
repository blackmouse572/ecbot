import { describe, it, expect, vi } from "vitest";
import { app } from "../src/index";

// INTERNAL_SECRET ("shh") comes from setup.ts's fixed process.env.
function mkEnv(overrides: Partial<any> = {}) {
  const stub = { fetch: vi.fn(async () => new Response("scheduled")) };
  const doNamespace = {
    idFromName: vi.fn(() => "do-id"),
    get: vi.fn(() => stub),
  };
  return {
    env: {
      INBOUND_QUEUE: { send: async () => {} },
      CONVERSATION_DO: doNamespace,
      ...overrides,
    },
    doNamespace,
    stub,
  };
}

const body = JSON.stringify({
  conversationId: "c1",
  senderId: "s1",
  customerId: "cu1",
  contactPointId: "cp1",
  text: "hi",
});

describe("POST /internal/debounce auth", () => {
  it("rejects a missing x-internal-secret header with 403 and never calls the DO", async () => {
    const { env, doNamespace, stub } = mkEnv();
    const res = await app.request(
      "/internal/debounce",
      { method: "POST", body },
      env,
    );
    expect(res.status).toBe(403);
    expect(doNamespace.idFromName).not.toHaveBeenCalled();
    expect(doNamespace.get).not.toHaveBeenCalled();
    expect(stub.fetch).not.toHaveBeenCalled();
  });

  it("rejects a wrong x-internal-secret header with 403 and never calls the DO", async () => {
    const { env, doNamespace, stub } = mkEnv();
    const res = await app.request(
      "/internal/debounce",
      { method: "POST", body, headers: { "x-internal-secret": "wrong" } },
      env,
    );
    expect(res.status).toBe(403);
    expect(doNamespace.idFromName).not.toHaveBeenCalled();
    expect(doNamespace.get).not.toHaveBeenCalled();
    expect(stub.fetch).not.toHaveBeenCalled();
  });

  it("forwards to the DO stub when the secret matches", async () => {
    const { env, doNamespace, stub } = mkEnv();
    const res = await app.request(
      "/internal/debounce",
      { method: "POST", body, headers: { "x-internal-secret": "shh" } },
      env,
    );
    expect(doNamespace.idFromName).toHaveBeenCalledWith("c1");
    expect(doNamespace.get).toHaveBeenCalledWith("do-id");
    expect(stub.fetch).toHaveBeenCalledWith(
      "http://do/schedule",
      expect.objectContaining({ method: "POST" }),
    );
    expect(res.status).toBe(200);
  });
});

describe("POST /internal/debounce response", () => {
  it("answers the DO's response even though its headers are immutable", async () => {
    // On Workers a Response from a Durable Object stub has immutable headers.
    // The site-wide X-Robots-Tag middleware used to set a header on it and
    // turn every scheduled debounce into a 500.
    const doResponse = new Response("scheduled");
    Object.defineProperty(doResponse.headers, "set", {
      value: () => {
        throw new TypeError("Can't modify immutable headers.");
      },
    });
    const { env } = mkEnv();
    env.CONVERSATION_DO.get = vi.fn(() => ({
      fetch: vi.fn(async () => doResponse),
    }));

    const res = await app.request(
      "/internal/debounce",
      { method: "POST", body, headers: { "x-internal-secret": "shh" } },
      env,
    );

    expect(res.status).toBe(200);
    expect(await res.text()).toBe("scheduled");
    expect(res.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
  });
});
