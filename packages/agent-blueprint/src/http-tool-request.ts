/**
 * Where an HTTP tool sends each argument of a call (#432). A parameter's
 * "Send in" is stored as `x-in` on its JSON Schema property; without it the
 * old routing applies: `{name}` in the URL path, else the query for GET and
 * DELETE and the JSON body for the rest. The API runs this, and the app shows
 * it as the request preview, so the two never disagree.
 */
export type HttpParamIn = "path" | "query" | "body";

export const HTTP_PARAM_IN: readonly HttpParamIn[] = ["path", "query", "body"];

/** The JSON Schema keyword that holds a parameter's Send in. */
export const PARAM_IN_KEY = "x-in";

/** Methods whose arguments go in the query string by default. */
const QUERY_METHODS = ["GET", "DELETE"];

const PLACEHOLDER = /\{([A-Za-z_][\w-]*)\}/g;

/** Origin, path, and the ?query#fragment that follows. */
const URL_PARTS = /^([a-z][a-z\d+.-]*:\/\/[^/?#]*)([^?#]*)(.*)$/is;

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** The `{name}`s in the URL's path (never its origin). */
export function pathParamNames(url: string): string[] {
  const path = URL_PARTS.exec(url)?.[2] ?? "";
  return [...path.matchAll(PLACEHOLDER)].map((m) => m[1]!);
}

/** Where an argument goes when its parameter has no Send in. */
export function paramInDefault(method: string, url: string, key: string): HttpParamIn {
  if (pathParamNames(url).includes(key)) return "path";
  return QUERY_METHODS.includes(method.toUpperCase()) ? "query" : "body";
}

function declaredIn(inputSchema: unknown, key: string): HttpParamIn | undefined {
  const props = isObject(inputSchema) ? inputSchema.properties : undefined;
  const value = isObject(props) && isObject(props[key]) ? props[key][PARAM_IN_KEY] : undefined;
  return HTTP_PARAM_IN.includes(value as HttpParamIn) ? (value as HttpParamIn) : undefined;
}

export type HttpToolRequestPlan = {
  /** The URL with its path placeholders filled; the query is not added yet. */
  url: string;
  query: Record<string, unknown>;
  /** The JSON body, or undefined when none is sent. */
  body?: Record<string, unknown>;
  /** Set when the call cannot be made (a path argument is missing). */
  error?: string;
};

/**
 * Splits a call's arguments into path, query and body. Path placeholders are
 * filled URL-encoded and only in the path, so an argument cannot move the
 * request (and its credential) to another host. A GET never has a body, so a
 * Body parameter on a GET goes to the query.
 */
export function planHttpToolRequest(input: {
  method: string;
  url: string;
  inputSchema?: unknown;
  args: Record<string, unknown>;
}): HttpToolRequestPlan {
  const method = input.method.toUpperCase();
  const args = input.args ?? {};
  const parts = URL_PARTS.exec(input.url);
  const used = new Set<string>();
  let error: string | undefined;
  let url = input.url;
  if (parts) {
    const [, origin, path, tail] = parts;
    const filled = path!.replace(PLACEHOLDER, (match, name: string) => {
      used.add(name);
      const value = args[name];
      if (value === undefined || value === null || value === "") {
        error ??= `Missing argument "${name}" for the URL path`;
        return match;
      }
      const text = typeof value === "object" ? JSON.stringify(value) : String(value);
      if (text === "." || text === "..") {
        error ??= `Argument "${name}" cannot be "${text}"`;
        return match;
      }
      return encodeURIComponent(text);
    });
    url = `${origin}${filled}${tail}`;
  }

  const query: Record<string, unknown> = {};
  const body: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    if (used.has(key) || value === undefined || value === null) continue;
    const declared = declaredIn(input.inputSchema, key);
    let where = declared === "query" || declared === "body" ? declared : paramInDefault(method, input.url, key);
    if (where === "body" && method === "GET") where = "query";
    (where === "query" ? query : body)[key] = value;
  }
  const sendBody = method !== "GET" && (!QUERY_METHODS.includes(method) || Object.keys(body).length > 0);
  return { url, query, ...(sendBody ? { body } : {}), ...(error ? { error } : {}) };
}

/** The schema without Send in, which is ours and not for the model. */
export function stripParamIn<T>(inputSchema: T): T {
  if (!isObject(inputSchema) || !isObject(inputSchema.properties)) return inputSchema;
  const properties = Object.fromEntries(
    Object.entries(inputSchema.properties).map(([key, prop]) => {
      if (!isObject(prop) || !(PARAM_IN_KEY in prop)) return [key, prop];
      const { [PARAM_IN_KEY]: _, ...rest } = prop;
      return [key, rest];
    }),
  );
  return { ...inputSchema, properties } as T;
}
