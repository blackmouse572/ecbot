// e2e/helpers/wait-for-services.ts
import { request } from "@playwright/test";
import { API_URL, AI_URL } from "../config";

const SERVICES = [
  { name: "API", url: `${API_URL}/api/public/health/ready` },
  { name: "AI", url: `${AI_URL}/health` },
];

/**
 * Polls each service's health endpoint until healthy or the per-service deadline
 * elapses. Uses exponential backoff (capped) so a booting service returning non-2xx
 * doesn't get hammered in a tight loop, and surfaces the last failure in the thrown
 * error so CI logs show *why* a service never came up.
 */
export async function waitForServices(timeoutMs = 60_000): Promise<void> {
  for (const svc of SERVICES) {
    const deadline = Date.now() + timeoutMs;
    let attempt = 0;
    let healthy = false;
    let lastError = "no attempt made";

    while (Date.now() < deadline) {
      try {
        const ctx = await request.newContext();
        const res = await ctx.get(svc.url);
        await ctx.dispose();
        if (res.ok()) {
          healthy = true;
          break;
        }
        lastError = `HTTP ${res.status()}`;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }

      const delay = Math.min(5_000, 500 * 2 ** attempt);
      attempt += 1;
      await new Promise((r) => setTimeout(r, delay));
    }

    if (!healthy) {
      throw new Error(
        `${svc.name} did not become healthy within ${timeoutMs}ms (last error: ${lastError})`,
      );
    }
  }
}
