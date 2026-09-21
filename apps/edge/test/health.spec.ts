import { describe, it, expect } from "vitest";
import { app } from "../src/index";

describe("GET /health", () => {
  it("returns 200 ok", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("ok");
  });
});

describe("crawler opt-out", () => {
  it("serves a Disallow-all robots.txt", async () => {
    const res = await app.request("/robots.txt");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("User-agent: *\nDisallow: /\n");
  });

  it("sets X-Robots-Tag: noindex on every response", async () => {
    const res = await app.request("/health");
    expect(res.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
  });
});
