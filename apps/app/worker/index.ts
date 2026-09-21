import { Hono } from "hono";
const app = new Hono<{ Bindings: Env }>();

app.get("/api/", (c) => c.json({ name: "Cloudflare" }));

/**
 * Serve the embeddable widget page with a `frame-ancestors` CSP built from the
 * account's allowlist.
 *
 * This is the only part of the domain allowlist a browser actually enforces.
 * The widget also sends its `document.referrer` for the API to compare, but
 * that value comes from the widget itself and cannot be trusted; the `Origin`
 * header is useless here because the iframe is served from our own domain. A
 * `frame-ancestors` directive, by contrast, makes the browser refuse to render
 * the frame on a site that is not on the list. See ADR-0014.
 */
app.get("/widget/:key", async (c) => {
  const key = c.req.param("key");

  let allowedOrigins: string[] = [];
  try {
    const res = await fetch(
      `${c.env.VITE_API_URL}/api/v1/public/widget/${encodeURIComponent(key)}/meta`,
      { headers: { accept: "application/json" } },
    );
    if (res.ok) {
      const body = (await res.json()) as {
        data?: { allowedOrigins?: string[] };
      };
      allowedOrigins = body.data?.allowedOrigins ?? [];
    }
  } catch {
    // Fall through with an empty list — see below.
  }

  // An unknown key, or an API we could not reach, must not become an
  // embed-anywhere page. `'none'` fails closed.
  const ancestors = allowedOrigins.length
    ? allowedOrigins.join(" ")
    : "'none'";

  // Hand back the SPA shell; React Router renders /widget/:key inside it.
  const shell = await c.env.ASSETS.fetch(new URL("/", c.req.url));
  const html = await shell.text();

  return c.html(html, 200, {
    "Content-Security-Policy": `frame-ancestors ${ancestors}`,
    // The allowlist can change; don't let a CDN pin an old one.
    "Cache-Control": "no-store",
  });
});

export default app;
