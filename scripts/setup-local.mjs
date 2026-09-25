#!/usr/bin/env node
// `pnpm setup:local` — get a fresh checkout to a bootable local stack.
//
// Two kinds of configuration, handled differently:
//
//   Filled for you, without asking: values that only have to be *consistent*,
//   not chosen — JWT keys and key ids, CORS origins, internal secrets, and the
//   API key pairs that have to match between the API, the web app and the AI
//   service. A value you already set is never overwritten.
//
//   Asked of you: values only you can get — an OpenRouter key, email and
//   channel credentials. Prompted for on a terminal; listed (and never
//   invented) with --yes, --check, or when there is no terminal.
//
// Re-running is safe: it only ever fills what is still empty.

import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import {
  EnvFile,
  isPlaceholder,
  mergeCorsOrigins,
  missingManual,
  MANUAL_VALUES,
  randomApiKeyPair,
  resolvePair,
  splitPair,
} from "./setup-local/lib.mjs";

const HELP = `Usage: pnpm setup:local [options]

Prepares apps/api, apps/app and apps/ai .env files for local development.

Options
  --yes                 Never prompt; list missing values instead
  --check               Change nothing; report what is missing (exit 1 if a
                        required value is missing)
  --origin <url>        Extra origin the API accepts (repeatable), e.g. another
                        local frontend
  --client-env <path>   Extra frontend .env to receive the default API key pair
                        and API URL (repeatable; created from <path>.example)
  --root <dir>          Repository root (default: this script's repo)
  -h, --help            Show this help
`;

function parseArgs(argv) {
  const opts = {
    yes: false,
    check: false,
    origins: [],
    clientEnvs: [],
    root: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => {
      const v = argv[++i];
      if (!v) throw new Error(`${arg} needs a value`);
      return v;
    };
    if (arg === "--yes" || arg === "-y") opts.yes = true;
    else if (arg === "--check") opts.check = true;
    else if (arg === "--origin") opts.origins.push(next());
    else if (arg === "--client-env") opts.clientEnvs.push(next());
    else if (arg === "--root") opts.root = next();
    else if (arg === "-h" || arg === "--help") opts.help = true;
    else throw new Error(`Unknown option ${arg}\n\n${HELP}`);
  }
  return opts;
}

const opts = parseArgs(process.argv.slice(2));
if (opts.help) {
  process.stdout.write(HELP);
  process.exit(0);
}

const root = path.resolve(
  opts.root ?? path.join(path.dirname(fileURLToPath(import.meta.url)), ".."),
);
const rel = (p) => path.relative(process.cwd(), p) || ".";
const log = (...a) => console.log(...a);
const report = { filled: [], entered: [], created: [], warnings: [] };

// --- 1. .env files ---------------------------------------------------------

const FILES = {
  api: path.join(root, "apps/api/.env"),
  app: path.join(root, "apps/app/.env"),
  ai: path.join(root, "apps/ai/.env"),
};

function load(file) {
  if (fs.existsSync(file)) return new EnvFile(fs.readFileSync(file, "utf8"));
  const example = `${file}.example`;
  if (!fs.existsSync(example)) {
    report.warnings.push(`${rel(file)} and ${rel(example)} are both missing`);
    return null;
  }
  report.created.push(rel(file));
  const env = new EnvFile(fs.readFileSync(example, "utf8"));
  env.isNew = true;
  return env;
}

const env = Object.fromEntries(
  Object.entries(FILES).map(([name, file]) => [name, load(file)]),
);
const clients = opts.clientEnvs.map((p) => {
  const file = path.resolve(p);
  return { file, env: load(file) };
});

if (!env.api) {
  console.error(
    `No apps/api/.env or .env.example under ${root}. Is --root right?`,
  );
  process.exit(1);
}

// --- 2. JWT keys ------------------------------------------------------------
//
// generate:keys writes the keypairs, jwks.json (served by the compose
// jwks-server), and syncs the KIDs + OAUTH_TOKEN_ENCRYPT_KEY into apps/api/.env.
// It regenerates every time, which logs everyone out — so only run it when
// something is actually missing.

const keysDir = path.join(root, "apps/api/keys");
const keysPresent = [
  "access-token.pem",
  "refresh-token.pem",
  "jwks.json",
].every((f) => fs.existsSync(path.join(keysDir, f)));
const kidsPresent =
  env.api.get("AUTH_JWT_ACCESS_TOKEN_KID") !== "" &&
  env.api.get("AUTH_JWT_REFRESH_TOKEN_KID") !== "";
const needKeys = !keysPresent || !kidsPresent;

// --- 3. Consistency values -------------------------------------------------

const httpPort = env.api.get("HTTP_PORT") || "8080";
const apiUrl = `http://localhost:${httpPort}`;
const appOrigin = "http://localhost:5173";

{
  const current = env.api.get("MIDDLEWARE_CORS_ORIGIN");
  const { value, replacedWildcard } = mergeCorsOrigins(current, [
    appOrigin,
    ...opts.origins,
  ]);
  if (value !== current) {
    env.api.set("MIDDLEWARE_CORS_ORIGIN", value);
    report.filled.push(
      `MIDDLEWARE_CORS_ORIGIN = ${value}${
        replacedWildcard ? " (was *, which disables credentials)" : ""
      }`,
    );
  }
}

const hex = (n) => crypto.randomBytes(n).toString("hex");
for (const [key, make] of [
  ["WORK_SPACE_INVITATION_TOKEN_SECRET_KEY", () => hex(32)],
  ["CHATBOT_PREVIEW_SHARE_TOKEN_SECRET_KEY", () => hex(32)],
  ["TELEGRAM_WEBHOOK_SECRET_TOKEN", () => hex(32)],
]) {
  if (env.api.has(key) && isPlaceholder(env.api.get(key))) {
    env.api.set(key, make());
    report.filled.push(`${key} (random)`);
  }
}

// Default API key: the seed stores it, every frontend presents it.
{
  const frontends = [
    { label: "apps/app/.env", env: env.app },
    ...clients.map((c) => ({ label: rel(c.file), env: c.env })),
  ].filter((f) => f.env);
  const { generated, conflicts } = resolvePair({
    owner: {
      read: () => splitPair(env.api.get("E2E_SEED_DEFAULT_API_KEY")),
      write: (p) =>
        env.api.set("E2E_SEED_DEFAULT_API_KEY", `${p.key}:${p.secret}`),
    },
    consumers: frontends.map((f) => ({
      label: f.label,
      read: () => {
        const key = f.env.get("VITE_API_KEY");
        const secret = f.env.get("VITE_API_KEY_SECRET");
        return key && secret ? { key, secret } : null;
      },
      write: (p) => {
        f.env.set("VITE_API_KEY", p.key);
        f.env.set("VITE_API_KEY_SECRET", p.secret);
      },
    })),
    generate: () => randomApiKeyPair(),
  });
  if (
    env.api.changed.includes("E2E_SEED_DEFAULT_API_KEY") ||
    frontends.some((f) => f.env.changed.includes("VITE_API_KEY"))
  ) {
    report.filled.push(
      `Default API key pair ${generated ? "(generated)" : "(shared)"}: E2E_SEED_DEFAULT_API_KEY ↔ VITE_API_KEY in ${frontends.map((f) => f.label).join(", ")}`,
    );
  }
  for (const label of conflicts) {
    report.warnings.push(
      `${label} has a different VITE_API_KEY than E2E_SEED_DEFAULT_API_KEY — left as is. Clear both VITE_API_KEY lines to re-share.`,
    );
  }
  for (const f of frontends) {
    const url = f.env.get("VITE_API_URL");
    if (url === "" || /example\.com/.test(url)) {
      f.env.set("VITE_API_URL", apiUrl);
      report.filled.push(`VITE_API_URL = ${apiUrl} in ${f.label}`);
    }
  }
}

// AI service key: the seed stores it, the AI service presents it on callbacks.
if (env.ai) {
  const { generated, conflicts } = resolvePair({
    owner: {
      read: () => {
        const key = env.api.get("AI_SERVICE_API_KEY");
        const secret = env.api.get("AI_SERVICE_API_SECRET");
        return key && secret ? { key, secret } : null;
      },
      write: (p) => {
        env.api.set("AI_SERVICE_API_KEY", p.key);
        env.api.set("AI_SERVICE_API_SECRET", p.secret);
      },
    },
    consumers: [
      {
        label: "apps/ai/.env",
        read: () => {
          const key = env.ai.get("AI_SERVICE_API_KEY");
          const secret = env.ai.get("AI_SERVICE_API_SECRET");
          return key && secret ? { key, secret } : null;
        },
        write: (p) => {
          env.ai.set("AI_SERVICE_API_KEY", p.key);
          env.ai.set("AI_SERVICE_API_SECRET", p.secret);
        },
      },
    ],
    generate: () => randomApiKeyPair(),
  });
  if (
    env.api.changed.includes("AI_SERVICE_API_KEY") ||
    env.ai.changed.includes("AI_SERVICE_API_KEY")
  ) {
    report.filled.push(
      `AI service key pair ${generated ? "(generated)" : "(shared)"}: apps/api ↔ apps/ai`,
    );
  }
  for (const label of conflicts) {
    report.warnings.push(
      `${label} has a different AI_SERVICE_API_KEY than apps/api/.env — the AI service's callbacks will be rejected.`,
    );
  }
}

if (
  env.api.has("CLOUD_TASKS_SYSTEM_API_KEY") &&
  !splitPair(env.api.get("CLOUD_TASKS_SYSTEM_API_KEY"))
) {
  const p = randomApiKeyPair();
  env.api.set("CLOUD_TASKS_SYSTEM_API_KEY", `${p.key}:${p.secret}`);
  report.filled.push("CLOUD_TASKS_SYSTEM_API_KEY (generated pair)");
}

// --- 4. Values only you can supply ------------------------------------------

async function prompt(question, { secret = false } = {}) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });
  if (secret) {
    // Echo nothing after the question itself.
    const write = rl._writeToOutput.bind(rl);
    let asked = false;
    rl._writeToOutput = (s) => {
      if (!asked) {
        write(s);
        asked = true;
      }
    };
  }
  const answer = await new Promise((resolve) => rl.question(question, resolve));
  rl.close();
  if (secret) process.stdout.write("\n");
  return answer.trim();
}

const interactive =
  !opts.yes && !opts.check && process.stdin.isTTY && process.stdout.isTTY;

if (interactive) {
  const pending = missingManual(env);
  const optional = pending.filter((g) => !g.required);
  let offerOptional = false;
  if (optional.length) {
    const ans = await prompt(
      `\nOptional integrations not configured: ${optional.map((g) => g.group).join("; ")}.\nSet any up now? [y/N] `,
    );
    offerOptional = /^y/i.test(ans);
  }
  for (const group of pending) {
    if (!group.required) {
      if (!offerOptional) continue;
      const ans = await prompt(
        `\n${group.group} — ${group.why}\nConfigure? [y/N] `,
      );
      if (!/^y/i.test(ans)) continue;
    } else {
      log(`\n${group.group} (required) — ${group.why}`);
    }
    log(`Get it from: ${group.where}`);
    for (const v of group.values) {
      const hint = v.example ? ` (e.g. ${v.example})` : "";
      const answer = await prompt(`  ${v.key}${hint}: `, { secret: v.secret });
      if (!answer) continue;
      env[v.file].set(v.key, answer);
      report.entered.push(v.key);
      // Mirror values the frontend needs under its own name.
      for (const g of MANUAL_VALUES) {
        for (const m of g.values) {
          if (m.sameAs === v.key && env[m.file]) {
            env[m.file].set(m.key, answer);
          }
        }
      }
    }
  }
}

// --- 5. Write, then keys ------------------------------------------------------

const targets = [
  ...Object.entries(FILES).map(([name, file]) => ({ file, env: env[name] })),
  ...clients,
].filter((t) => t.env && (t.env.isNew || t.env.changed.length));

if (opts.check) {
  log("--check: nothing written.");
} else {
  for (const t of targets) fs.writeFileSync(t.file, t.env.toString());
  if (needKeys) {
    log("Generating JWT keys (apps/api/keys, KIDs into apps/api/.env)…");
    execFileSync("pnpm", ["--filter", "api", "generate:keys"], {
      cwd: root,
      stdio: "inherit",
    });
    report.filled.push(
      "JWT keys, jwks.json, AUTH_JWT_*_KID, OAUTH_TOKEN_ENCRYPT_KEY",
    );
  }
}

// --- 6. Report ----------------------------------------------------------------

const verb = opts.check ? "Would fill" : "Filled";
if (report.created.length)
  log(
    `\n${opts.check ? "Would create" : "Created"} from .env.example: ${report.created.join(", ")}`,
  );
if (opts.check && needKeys) report.filled.push("JWT keys (pnpm generate:keys)");
if (report.filled.length) {
  log(`\n${verb} automatically:`);
  for (const f of report.filled) log(`  • ${f}`);
} else {
  log("\nNothing to fill — every consistency value is already set.");
}

if (report.entered.length) {
  log(`\nSaved from your input: ${report.entered.join(", ")}`);
}

const stillMissing = missingManual(env);
const requiredMissing = stillMissing.filter((g) => g.required);
if (stillMissing.length) {
  log("\nNeeds a value from you:");
  for (const g of stillMissing) {
    log(
      `  ${g.required ? "✗ required" : "○ optional"}  ${g.group}: ${g.values.map((v) => `${v.key} (${path.join("apps", v.file, ".env")})`).join(", ")}`,
    );
    log(`      ${g.why} → ${g.where}`);
  }
}

if (report.warnings.length) {
  log("\nWarnings:");
  for (const w of report.warnings) log(`  ! ${w}`);
}

if (!opts.check && report.filled.some((f) => /API key pair/.test(f))) {
  log(
    "\nNote: the seed only creates API keys that do not exist yet. If this database was\n" +
      "seeded before, the new pairs are not in it — seed a fresh database, or remove the\n" +
      "old keys first (`pnpm --filter api exec nestjs-command remove:apikey`, dev only).",
  );
}

if (!opts.check) {
  log(`
Next:
  docker compose up -d            # Postgres (pgvector), Redis, JWKS server
  pnpm db:migrate:up
  pnpm db:seed                    # demo users: admin@mail.com / aaAA@123
  pnpm dev:app                    # api :${httpPort} + app :5173`);
}

process.exit(opts.check && (requiredMissing.length || needKeys) ? 1 : 0);
