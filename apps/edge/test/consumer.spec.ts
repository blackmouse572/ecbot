import { describe, it, expect, vi } from "vitest";
import { postToServer } from "../src/server-client";
import worker from "../src/index";

// SERVER_URL/SERVER_API_KEY come from setup.ts's fixed process.env.

describe("postToServer", () => {
  it("POSTs JSON with the x-api-key header", async () => {
    const fetchMock = vi.fn(async () => new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await postToServer("/api/v1/system/poc/inbound", { a: 1 });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://nest/api/v1/system/poc/inbound",
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": "k:s" },
        body: JSON.stringify({ a: 1 }),
      },
    );
  });
});

describe("queue consumer", () => {
  it("forwards each message to /poc/inbound and acks it", async () => {
    const fetchMock = vi.fn(async () => new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const ack = vi.fn();
    const retry = vi.fn();
    const batch = {
      messages: [
        {
          body: {
            platform: "telegram",
            botId: "b1",
            rawBody: '{"x":1}',
            headers: {},
          },
          ack,
          retry,
        },
      ],
    };
    await (worker as any).queue(batch);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://nest/api/v1/system/poc/inbound",
      expect.objectContaining({ method: "POST" }),
    );
    expect(ack).toHaveBeenCalledOnce();
    expect(retry).not.toHaveBeenCalled();
  });

  it("retries a message when Nest returns 5xx", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("err", { status: 500 })),
    );
    const ack = vi.fn();
    const retry = vi.fn();
    await (worker as any).queue({
      messages: [
        {
          body: { platform: "messenger", rawBody: "{}", headers: {} },
          ack,
          retry,
        },
      ],
    });
    expect(retry).toHaveBeenCalledOnce();
    expect(ack).not.toHaveBeenCalled();
  });
});
