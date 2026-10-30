import {
  planHttpToolRequest,
  type HttpToolRequestPlan,
} from "@repo/agent-blueprint";

export type HttpRequestPreviewText =
  | { problem: NonNullable<HttpToolRequestPlan["problem"]> }
  | { line: string; body?: string };

/**
 * The request a test call will make, from the same plan the API runs. The
 * query is appended plainly here; the API also drops arguments that would
 * replace a parameter fixed in the URL.
 */
export const httpRequestPreviewText = (input: {
  method: string;
  url: string;
  inputSchema?: unknown;
  args: Record<string, unknown>;
}): HttpRequestPreviewText => {
  const plan = planHttpToolRequest(input);
  if (plan.problem) return { problem: plan.problem };
  const pairs = Object.entries(plan.query).map(([k, v]) => [
    k,
    typeof v === "object" ? JSON.stringify(v) : String(v),
  ]);
  const query = new URLSearchParams(pairs).toString();
  const [base, hash = ""] = plan.url.split(/(?=#)/);
  const sep = !query ? "" : base!.includes("?") ? "&" : "?";
  return {
    line: `${input.method} ${base}${sep}${query}${hash}`,
    ...(plan.body ? { body: JSON.stringify(plan.body, null, 2) } : {}),
  };
};
