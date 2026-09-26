import { describe, it, expect, vi, afterEach } from "vitest";
import { app } from "../src/index";

function mkEnv(overrides: Partial<any> = {}) {
  return {
    INBOUND_QUEUE: { send: async () => {} },
    ...overrides,
  };
}

/**
 * receipt() posts straight to apps/api and only falls back to the queue when
 * that fails, so each test has to say which of the two paths it exercises.
 */
function stubFetch(response: () => Response | Promise<Response>) {
  const posted: any[] = [];
  vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
    posted.push(JSON.parse(init.body as string));
    return response();
  });
  return posted;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const body = JSON.stringify({
  update_id: 1,
  message: { message_id: 42, chat: { id: 7 }, text: "hi" },
});

describe("webhook receipt", () => {
  it("posts straight to apps/api and leaves the queue alone", async () => {
    const posted = stubFetch(() => new Response("ok", { status: 201 }));
    let enqueued = 0;
    const env = mkEnv({
      INBOUND_QUEUE: {
        send: async () => {
          enqueued++;
        },
      },
    });

    const res = await app.request(
      "/webhooks/messenger",
      { method: "POST", body: '{"object":"page"}', headers: {} },
      env,
    );

    expect(res.status).toBe(200);
    expect(posted).toHaveLength(1);
    expect(posted[0]).toMatchObject({
      platform: "messenger",
      rawBody: '{"object":"page"}',
    });
    expect(enqueued).toBe(0);
  });

  it("stamps receivedAt so apps/api can split platform->edge from edge->api", async () => {
    const posted = stubFetch(() => new Response("ok", { status: 201 }));
    const before = Date.now();

    const res = await app.request(
      "/webhooks/messenger",
      { method: "POST", body, headers: {} },
      mkEnv(),
    );
    const after = Date.now();

    expect(res.status).toBe(200);
    expect(typeof posted[0].receivedAt).toBe("number");
    expect(posted[0].receivedAt).toBeGreaterThanOrEqual(before);
    expect(posted[0].receivedAt).toBeLessThanOrEqual(after);
  });

  it("falls back to the queue when apps/api answers non-2xx", async () => {
    stubFetch(() => new Response("boom", { status: 500 }));
    let sent: any = null;
    const env = mkEnv({
      INBOUND_QUEUE: {
        send: async (m: any) => {
          sent = m;
        },
      },
    });

    const res = await app.request(
      "/webhooks/messenger",
      { method: "POST", body: '{"object":"page"}', headers: {} },
      env,
    );

    expect(res.status).toBe(200);
    expect(sent).toMatchObject({
      platform: "messenger",
      rawBody: '{"object":"page"}',
    });
  });

  it("falls back to the queue when the direct post throws", async () => {
    stubFetch(() => {
      throw new Error("network down");
    });
    let sent: any = null;
    const env = mkEnv({
      INBOUND_QUEUE: {
        send: async (m: any) => {
          sent = m;
        },
      },
    });

    const res = await app.request(
      "/webhooks/messenger",
      { method: "POST", body: '{"object":"page"}', headers: {} },
      env,
    );

    expect(res.status).toBe(200);
    expect(sent).toMatchObject({ platform: "messenger" });
  });

  it("telegram route forwards platform+botId+rawBody+headers and ACKs 200", async () => {
    const posted = stubFetch(() => new Response("ok", { status: 201 }));

    const res = await app.request(
      "/webhooks/telegram/bot123",
      {
        method: "POST",
        body,
        headers: { "x-telegram-bot-api-secret-token": "sekret" },
      },
      mkEnv(),
    );

    expect(res.status).toBe(200);
    expect(posted[0]).toMatchObject({
      platform: "telegram",
      botId: "bot123",
      rawBody: body,
    });
    expect(posted[0].headers["x-telegram-bot-api-secret-token"]).toBe("sekret");
  });

  it("generic route forwards platform slug with no botId", async () => {
    const posted = stubFetch(() => new Response("ok", { status: 201 }));

    const res = await app.request(
      "/webhooks/messenger",
      {
        method: "POST",
        body: '{"object":"page"}',
        headers: { "x-hub-signature-256": "sha256=abc" },
      },
      mkEnv(),
    );

    expect(res.status).toBe(200);
    expect(posted[0]).toMatchObject({
      platform: "messenger",
      rawBody: '{"object":"page"}',
    });
    expect(posted[0].botId).toBeUndefined();
    expect(posted[0].headers["x-hub-signature-256"]).toBe("sha256=abc");
  });
});

// Verified secret comes from setup.ts's fixed process.env.FACEBOOK_WEBHOOK_SECRET
// ("verify-me") — the worker no longer reads it per-request, so tests vary the
// query string's hub.verify_token against that fixed value instead of the env.
describe("webhook GET challenge (facebook)", () => {
  it("echoes hub.challenge with 200 when the verify token matches", async () => {
    const res = await app.request(
      "/webhooks/messenger?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=123",
      { method: "GET" },
      mkEnv(),
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("123");
  });

  it("rejects with 403 when the verify token doesn't match", async () => {
    const res = await app.request(
      "/webhooks/messenger?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=123",
      { method: "GET" },
      mkEnv(),
    );
    expect(res.status).toBe(403);
    expect(await res.text()).toBe("Forbidden");
  });

  it("also verifies via the facebook slug alias", async () => {
    const res = await app.request(
      "/webhooks/facebook?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=456",
      { method: "GET" },
      mkEnv(),
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("456");
  });

  it("verifies the WhatsApp handshake with the same Meta secret", async () => {
    const res = await app.request(
      "/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=789",
      { method: "GET" },
      mkEnv(),
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("789");
  });

  it("404s for a platform with no GET handshake", async () => {
    const res = await app.request("/webhooks/zalo", { method: "GET" }, mkEnv());
    expect(res.status).toBe(404);
  });

  it("404s for an unknown platform slug", async () => {
    const res = await app.request(
      "/webhooks/bogus",
      { method: "GET" },
      mkEnv(),
    );
    expect(res.status).toBe(404);
  });
});
