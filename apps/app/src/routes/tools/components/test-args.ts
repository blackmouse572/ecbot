import { pathParamNames } from "@repo/agent-blueprint";

/**
 * The args a test run sends: the JSON box, plus each filled path variable
 * (typed as a number when its parameter is a number). Null when the JSON is
 * not an object.
 */
export const buildTestArgs = (
  argsText: string,
  variables: Record<string, string>,
  inputSchema?: unknown,
): Record<string, unknown> | null => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(argsText.trim() || "{}");
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return null;
  }
  const props = (
    inputSchema as { properties?: Record<string, { type?: unknown }> }
  )?.properties;
  const args = { ...(parsed as Record<string, unknown>) };
  for (const [name, raw] of Object.entries(variables)) {
    const value = raw.trim();
    if (!value) continue;
    const type = props?.[name]?.type;
    const numeric =
      (type === "integer" || type === "number") && !isNaN(Number(value));
    args[name] = numeric ? Number(value) : value;
  }
  return args;
};

/** The `{name}`s in the URL path that the args leave empty. */
export const missingPathVariables = (
  url: string,
  args: Record<string, unknown>,
): string[] =>
  [...new Set(pathParamNames(url))].filter(
    (name) =>
      args[name] === undefined || args[name] === null || args[name] === "",
  );
