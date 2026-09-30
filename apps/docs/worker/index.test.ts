import { describe, expect, it } from "vitest";
import worker from "./index";

const assets = {
  fetch: async (req: Request) =>
    new Response(`asset:${new URL(req.url).pathname}`, { status: 200 }),
};
const env = { ASSETS: assets };

function get(path: string, headers: Record<string, string> = {}) {
  return worker.fetch(new Request(`https://ecbot.dev${path}`, { headers }), env);
}

describe("docs worker", () => {
  it("redirects bare /docs to the visitor's locale", async () => {
    const res = await get("/docs/channels", { "accept-language": "vi-VN,vi;q=0.9" });
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://ecbot.dev/vi/docs/channels");
  });

  it("prefers the NEXT_LOCALE cookie the marketing site sets", async () => {
    const res = await get("/docs", {
      cookie: "NEXT_LOCALE=en",
      "accept-language": "vi",
    });
    expect(res.headers.get("location")).toBe("https://ecbot.dev/en/docs");
  });

  it("falls back to English", async () => {
    const res = await get("/docs/");
    expect(res.headers.get("location")).toBe("https://ecbot.dev/en/docs");
  });

  it("serves files under /docs as they are", async () => {
    const res = await get("/docs/llms.txt");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/plain; charset=utf-8");
  });

  it("serves markdown copies as text/markdown", async () => {
    const res = await get("/docs/md/en/channels.md");
    expect(res.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
  });

  it("serves locale pages and /_docs assets untouched", async () => {
    expect(await (await get("/vi/docs/channels")).text()).toBe("asset:/vi/docs/channels");
    expect(await (await get("/_docs/_next/static/a.js")).text()).toBe(
      "asset:/_docs/_next/static/a.js",
    );
  });
});
