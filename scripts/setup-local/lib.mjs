// Pure pieces of `pnpm setup:local`: reading and editing .env files, and
// deciding what to fill. No I/O here beyond what the caller passes in, so the
// rules can be tested without touching a real checkout.

import crypto from "node:crypto";

const LINE = /^(\s*(?:export\s+)?)([A-Za-z_][A-Za-z0-9_]*)(\s*=\s*)(.*)$/;

/** Parse one raw value the way dotenv does for the cases our examples use. */
function unquote(raw) {
  const value = raw.trim();
  const quoted = value.match(/^(["'])(.*)\1$/);
  if (quoted) return { value: quoted[2], quote: quoted[1] };
  // Unquoted: a ` #` starts a trailing comment.
  return { value: value.replace(/\s+#.*$/, ""), quote: "" };
}

/**
 * An editable .env file. Keeps every line it doesn't touch byte-for-byte, and
 * keeps an edited line's quoting style, so a diff of the result shows only
 * the values that changed.
 */
export class EnvFile {
  constructor(text = "") {
    this.lines = text.split("\n");
    this.changed = [];
  }

  #find(key) {
    return this.lines.findIndex((line) => {
      const m = line.match(LINE);
      return m && m[2] === key;
    });
  }

  has(key) {
    return this.#find(key) !== -1;
  }

  /** The value, or '' when the key is absent or empty. */
  get(key) {
    const i = this.#find(key);
    if (i === -1) return "";
    return unquote(this.lines[i].match(LINE)[4]).value;
  }

  set(key, value) {
    const i = this.#find(key);
    if (i === -1) {
      // Append before a trailing blank line, so the file keeps ending in
      // exactly one newline.
      const at =
        this.lines.length && this.lines[this.lines.length - 1] === ""
          ? this.lines.length - 1
          : this.lines.length;
      this.lines.splice(at, 0, `${key}=${value}`);
    } else {
      const [, lead, name, eq, raw] = this.lines[i].match(LINE);
      const { quote } = unquote(raw);
      this.lines[i] = `${lead}${name}${eq}${quote}${value}${quote}`;
    }
    this.changed.push(key);
  }

  /** Set only when empty. Returns whether it wrote. */
  fill(key, value) {
    if (this.get(key) !== "") return false;
    this.set(key, value);
    return true;
  }

  toString() {
    return this.lines.join("\n");
  }
}

const ALNUM = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export function randomAlnum(length, bytes = crypto.randomBytes) {
  const buf = bytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += ALNUM[buf[i] % ALNUM.length];
  return out;
}

/**
 * A key/secret pair shaped like the API's own (`<env>_<25>` / 35 chars).
 * Neither half may contain ':', which is the x-api-key separator.
 */
export function randomApiKeyPair(bytes = crypto.randomBytes) {
  return {
    key: `local_${randomAlnum(25, bytes)}`,
    secret: randomAlnum(35, bytes),
  };
}

export function splitPair(value) {
  const [key, secret, ...rest] = (value ?? "").split(":");
  return key && secret && !rest.length ? { key, secret } : null;
}

/** Placeholders shipped in examples that must never reach a running stack. */
export function isPlaceholder(value) {
  return (
    value === "" || /^your[-_]/i.test(value) || /replace[-_]this/i.test(value)
  );
}

/**
 * Local origins the API should accept credentialed requests from.
 *
 * `*` is not a working default: the CORS middleware turns credentials off for
 * a wildcard (browsers refuse the combination), and every app sends
 * credentials. So `*` or empty becomes the explicit list; an explicit list the
 * user already wrote is extended with any origin passed in, never replaced.
 */
export function mergeCorsOrigins(current, origins) {
  const value = current.trim();
  if (value === "" || value === "*") {
    return { value: origins.join(","), replacedWildcard: value === "*" };
  }
  const list = value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const origin of origins) if (!list.includes(origin)) list.push(origin);
  return { value: list.join(","), replacedWildcard: false };
}

/**
 * Resolve a pair that has to match across files: an owner file that stores it
 * and consumer files that present it.
 *
 * - Whichever side already has a pair wins, and is copied to empty sides.
 * - Only when nobody has one is a new pair generated.
 * - A consumer holding a *different* pair is reported, not overwritten: it
 *   may point at a remote API on purpose.
 */
export function resolvePair({ owner, consumers, generate }) {
  const known = owner.read() ?? consumers.map((c) => c.read()).find(Boolean);
  const pair = known ?? generate();
  const conflicts = [];

  if (!owner.read()) owner.write(pair);
  for (const consumer of consumers) {
    const current = consumer.read();
    if (!current) consumer.write(pair);
    else if (current.key !== pair.key || current.secret !== pair.secret) {
      conflicts.push(consumer.label);
    }
  }
  return { pair, generated: !known, conflicts };
}

/**
 * Values nobody but the user can supply. `required` ones are asked for on every
 * interactive run until set; optional groups are offered once per run.
 */
export const MANUAL_VALUES = [
  {
    group: "LLM access",
    required: true,
    why: "Every chat, guardrail and embedding call goes through OpenRouter. Chatbots cannot reply without it.",
    where: "https://openrouter.ai/keys",
    values: [{ file: "ai", key: "OPENROUTER_API_KEY", secret: true }],
  },
  {
    group: "Email (invitations, password reset)",
    why: "Without it the API logs emails instead of sending them.",
    where: "https://resend.com/api-keys",
    values: [
      { file: "api", key: "RESEND_API_KEY", secret: true },
      {
        file: "api",
        key: "EMAIL_FROM",
        example: "Ecbot <noreply@yourdomain.com>",
      },
    ],
  },
  {
    group: "Facebook / Instagram channels",
    why: "Needed only to connect Facebook pages or Instagram accounts.",
    where: "https://developers.facebook.com/apps",
    values: [
      { file: "api", key: "FACEBOOK_APP_ID" },
      { file: "api", key: "FACEBOOK_APP_SECRET", secret: true },
      { file: "app", key: "VITE_FACEBOOK_APP_ID", sameAs: "FACEBOOK_APP_ID" },
    ],
  },
  {
    group: "Web crawling for knowledge bases",
    why: "Needed only to import websites into a knowledge base.",
    where: "https://www.firecrawl.dev/app/api-keys",
    values: [{ file: "ai", key: "FIRECRAWL_API_KEY", secret: true }],
  },
  {
    group: "Composio tools",
    why: "Needed only for the Composio built-in tools.",
    where: "https://app.composio.dev",
    values: [{ file: "api", key: "COMPOSIO_API_KEY", secret: true }],
  },
];

/** The manual values still empty in the given files. */
export function missingManual(files, { requiredOnly = false } = {}) {
  return MANUAL_VALUES.filter((g) => !requiredOnly || g.required)
    .map((group) => ({
      ...group,
      values: group.values.filter(
        (v) =>
          !v.sameAs && files[v.file] && isPlaceholder(files[v.file].get(v.key)),
      ),
    }))
    .filter((group) => group.values.length);
}
