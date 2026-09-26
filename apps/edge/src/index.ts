import { Context, Hono } from "hono";
import { postToServer } from "./server-client";
import { tracing } from "cloudflare:workers";
import { getChallengeVerifier } from "./platforms/registry";
import { env, type Env, type Bindings } from "./env";

export { ConversationDebounceDO } from "./conversation-do";

export const app = new Hono<{
  Bindings: Bindings;
  Variables: Env;
}>();

// This worker only ever serves API/webhook traffic — tell search engines to
// stay out (belt-and-suspenders: robots.txt for compliant crawlers, the
// header for ones that fetch first and check second).
app.use(async (c, next) => {
  await next();
  // Rebuild first: a Response passed through from fetch() (the debounce DO
  // stub) has immutable headers, and setting one on it throws.
  c.res = new Response(c.res.body, c.res);
  c.res.headers.set("X-Robots-Tag", "noindex, nofollow");
});
app.get("/robots.txt", (c) => c.text("User-agent: *\nDisallow: /\n"));

app.get("/health", (c) => c.text("ok"));

// Platforms with a GET handshake register a ChallengeVerifier (see
// platforms/registry.ts) — every other slug 404s, matching apps/api's
// behavior for platforms whose verifyChallenge() is null.
app.get("/webhooks/:platform", (c) => {
  const verifier = getChallengeVerifier(c.req.param("platform"));
  if (!verifier) return c.text("Not Found", 404);
  return verifier.verify(new URL(c.req.raw.url));
});

function headersToRecord(h: Headers): Record<string, string> {
  const o: Record<string, string> = {};
  h.forEach((v, k) => {
    o[k] = v;
  });
  return o;
}

interface InboundMessage {
  platform: string;
  botId?: string;
  rawBody: string;
  headers: Record<string, string>;
  /** Epoch ms at which the edge received the webhook (see receipt()). */
  receivedAt?: number;
}

// How long the direct hand-off may take before we give up and fall back to the
// queue. Long enough to cover an apps/api cold start's first bytes, short
// enough that a wedged server does not sit on the message.
const DIRECT_POST_TIMEOUT_MS = 10_000;

/**
 * Hand the message to apps/api, queue as the fallback.
 *
 * The queue used to be the only path, and it costs a measured p50 of 3.3s and
 * p90 of 4.7s (n=28) — 84% of everything between the customer pressing send
 * and apps/api seeing the message, and unaffected by max_batch_timeout, since
 * that is a cap rather than the driver. Posting straight to apps/api skips it.
 *
 * Durability is unchanged in substance: anything the direct post fails to
 * deliver — non-2xx, network error, timeout — still lands on the queue, whose
 * consumer retries exactly as before. ADR-0007 describes the ACK as following
 * a successful enqueue; here it precedes the hand-off instead, but the work
 * continues in waitUntil and the fallback covers every failure, so no message
 * is dropped on a path that used to hold it.
 */
async function deliver(msg: InboundMessage, queue: Queue): Promise<void> {
  try {
    const res = await postToServer(
      "/api/v1/system/poc/inbound",
      msg,
      AbortSignal.timeout(DIRECT_POST_TIMEOUT_MS),
    );
    if (res.ok) return;
    console.error(
      `[direct] ${msg.platform} -> ${res.status}, falling back to queue`,
    );
  } catch (err) {
    console.error(
      `[direct] ${msg.platform} threw (${(err as Error).message}), falling back to queue`,
    );
  }
  await queue.send(msg);
}

/**
 * Run work after the response is returned when the runtime offers it. Hono's
 * `executionCtx` getter throws when there is no ExecutionContext (unit tests
 * calling app.request without one), so fall back to awaiting inline.
 */
async function afterResponse(c: Context, work: Promise<void>): Promise<void> {
  try {
    c.executionCtx.waitUntil(work);
  } catch {
    await work;
  }
}

// Dumb receipt: forward rawBody + headers to apps/api. NO verify/parse here —
// the Nest handler runs adapter.verifySignature + adapter.parse (Option B).
async function receipt(c: Context, platform: string, botId?: string) {
  return tracing.enterSpan("receipt", async (span) => {
    span.setAttribute("eccho.platform", platform);
    if (botId) span.setAttribute("eccho.bot_id", botId);
    const rawBody = await c.req.text();
    span.setAttribute("eccho.raw_body_bytes", rawBody.length);
    console.log(`Receiving event for ${platform}${botId ? `/${botId}` : ""}`);
    // receivedAt lets apps/api report the two legs it cannot see on its own:
    // platform -> edge (payload timestamp vs this) and edge -> api (this vs
    // arrival). Without it the whole pre-api span is one opaque number.
    const msg: InboundMessage = {
      platform,
      botId,
      rawBody,
      headers: headersToRecord(c.req.raw.headers),
      receivedAt: Date.now(),
    };
    // ACK the platform now; the hand-off runs past the response so a cold or
    // slow apps/api cannot push Meta into its own retry.
    await afterResponse(c, deliver(msg, c.env.INBOUND_QUEUE));
    return c.text("EVENT_RECEIVED", 200);
  });
}

// Telegram carries botId in the URL (not the payload) — dedicated route.
app.post("/webhooks/telegram/:botId", (c) =>
  receipt(c, "telegram", c.req.param("botId")),
);
// Every other platform: generic slug route.
app.post("/webhooks/:platform", (c) => receipt(c, c.req.param("platform")));

// Nest calls this after persisting a message — forward to the per-conversation debounce DO.
app.post("/internal/debounce", async (c) => {
  return tracing.enterSpan("debounce", async (span) => {
    if (c.req.header("x-internal-secret") !== env.INTERNAL_SECRET) {
      span.setAttribute("eccho.forbidden", true);
      return c.text("Forbidden", 403);
    }
    const body = await c.req.json<{ conversationId: string }>();
    span.setAttribute("eccho.conversation_id", body.conversationId);
    const id = c.env.CONVERSATION_DO.idFromName(body.conversationId);
    const stub = c.env.CONVERSATION_DO.get(id);
    return stub.fetch("http://do/schedule", {
      method: "POST",
      body: JSON.stringify(body),
    });
  });
});

export default {
  fetch: app.fetch,
  async queue(batch: MessageBatch<InboundMessage>): Promise<void> {
    for (const msg of batch.messages) {
      await tracing.enterSpan("processInboundMessage", async (span) => {
        span.setAttribute("eccho.platform", msg.body.platform);
        if (msg.body.botId) span.setAttribute("eccho.bot_id", msg.body.botId);

        const res = await postToServer("/api/v1/system/poc/inbound", msg.body);
        span.setAttribute("eccho.server_status", res.status);

        if (!res.ok) {
          console.error(
            `[queue] ${msg.body.platform} -> ${res.status}: ${await res.clone().text()}`,
          );
        }
        if (res.status >= 500) msg.retry();
        else msg.ack();
      });
    }
  },
};
