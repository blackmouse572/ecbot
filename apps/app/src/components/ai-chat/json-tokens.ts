export type JsonToken = {
  kind: "key" | "string" | "number" | "plain";
  text: string;
};

const TOKEN =
  /("(?:[^"\\]|\\.)*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|\btrue\b|\bfalse\b|\bnull\b)/g;

/** Pretty-prints `value` as JSON and splits it into tokens to color. */
export function jsonTokens(value: unknown): JsonToken[] {
  const text = JSON.stringify(value, null, 2) ?? "undefined";
  const tokens: JsonToken[] = [];
  let last = 0;
  for (const match of text.matchAll(TOKEN)) {
    const index = match.index ?? 0;
    if (index > last)
      tokens.push({ kind: "plain", text: text.slice(last, index) });
    if (match[1] && match[2]) {
      tokens.push(
        { kind: "key", text: match[1] },
        { kind: "plain", text: match[2] },
      );
    } else if (match[1]) {
      tokens.push({ kind: "string", text: match[1] });
    } else {
      tokens.push({ kind: "number", text: match[0] });
    }
    last = index + match[0].length;
  }
  if (last < text.length)
    tokens.push({ kind: "plain", text: text.slice(last) });
  return tokens;
}
