import { afterEach, describe, expect, it, vi } from "vitest";
import app from "./index";

const SHELL = '<!doctype html><html><body><div id="root"></div></body></html>';

const env = {
  VITE_API_URL: "https://api.ecbot.dev",
  ASSETS: {
    fetch: async () =>
      new Response(SHELL, {
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
  },
};

function get(path: string) {
  // SAFETY: the generated Env is empty in-repo; it only carries ASSETS and
  // VITE_API_URL, both of which the stub above provides.
  return app.fetch(new Request(`https://app.ecbot.dev${path}`), env as never);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("app worker", () => {
  it("serves the SPA shell for client routes", async () => {
    for (const path of [
      "/login",
      "/verify-email?token=abc",
      "/auth/instagram/callback?code=x",
      "/shop/conversations/c-1",
    ]) {
      const res = await get(path);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/html");
      expect(await res.text()).toBe(SHELL);
    }
  });

  it("serves the shell without letting a CDN cache it", async () => {
    const res = await get("/login");
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("keeps the /api/ JSON route", async () => {
    const res = await get("/api/");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ name: "Cloudflare" });
  });

  it("keeps unknown /api/* paths at 404 instead of HTML", async () => {
    const res = await get("/api/v1/unknown");
    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toContain("text/plain");
  });

  it("keeps /widget/:key ahead of the fallback", async () => {
    vi.stubGlobal("fetch", async () =>
      Response.json({ data: { allowedOrigins: ["https://shop.example"] } }),
    );

    const res = await get("/widget/abc");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-security-policy")).toBe(
      "frame-ancestors https://shop.example",
    );
    expect(await res.text()).toBe(SHELL);
  });
});
