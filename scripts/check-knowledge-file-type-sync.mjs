#!/usr/bin/env node
// Guards against apps/api, apps/app (FE), and apps/ai silently drifting apart on
// which file types the knowledge-base RAG upload flow accepts. Each layer keeps
// its own hardcoded list (no shared config, no runtime fetch) — this is a static
// text diff run in CI to catch the next silent mismatch before it ships.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const FILE_ENUM_PATH =
  "apps/api/src/common/file/enums/file.enum.ts";
const CONTROLLER_PATH =
  "apps/api/src/modules/knowledge-base/controllers/knowledge-item.workspace.controller.ts";
const FE_SCHEMA_PATH =
  "apps/app/src/routes/knowledge-base/knowledge-item-create/components/schema.ts";
const FE_FILE_FORM_PATH =
  "apps/app/src/routes/knowledge-base/knowledge-item-create/components/forms/file-form.tsx";
const AI_TEXT_PROCESSING_PATH =
  "apps/ai/src/eccho_ai/llm/retrievers/text_processing.py";

// Some formats have more than one common file extension for the same mime
// type (e.g. .htm/.html both report text/html) — apps/ai's parser accepts
// both, but a mime-based FE/API check can't tell them apart, so there's
// nothing to diff against on those layers. Normalize before comparing.
const EXTENSION_ALIASES = { ".htm": ".html" };
function normalizeExtensions(set) {
  return new Set([...set].map((ext) => EXTENSION_ALIASES[ext] || ext));
}

function read(relPath) {
  return readFileSync(path.join(ROOT, relPath), "utf8");
}

function fail(message) {
  console.error(`✖ ${message}`);
  process.exitCode = 1;
}

// ── 1. Canonical mime <-> extension map from apps/api's ENUM_FILE_MIME_DOCUMENT ──

const enumSource = read(FILE_ENUM_PATH);

const enumBlockMatch = enumSource.match(
  /enum ENUM_FILE_MIME_DOCUMENT\s*\{([\s\S]*?)\}/,
);
if (!enumBlockMatch) {
  fail(`Could not find ENUM_FILE_MIME_DOCUMENT in ${FILE_ENUM_PATH}`);
  process.exit(1);
}
const keyToMime = new Map();
for (const m of enumBlockMatch[1].matchAll(/(\w+)\s*=\s*'([^']+)'/g)) {
  keyToMime.set(m[1], m[2]);
}

const extensionMapMatch = enumSource.match(
  /EXTENSION_BY_MIME[\s\S]*?=\s*\{([\s\S]*?)\};/,
);
if (!extensionMapMatch) {
  fail(`Could not find EXTENSION_BY_MIME in ${FILE_ENUM_PATH}`);
  process.exit(1);
}
const keyToExtension = new Map();
for (const m of extensionMapMatch[1].matchAll(
  /ENUM_FILE_MIME_DOCUMENT\.(\w+)\]:\s*'([^']+)'/g,
)) {
  keyToExtension.set(m[1], m[2]);
}

const mimeToExtension = new Map();
for (const [key, mime] of keyToMime) {
  const extension = keyToExtension.get(key);
  if (extension) mimeToExtension.set(mime, `.${extension}`);
}

// ── 2. apps/api — knowledge-item /create FileTypePipe allowlist ──

const controllerSource = read(CONTROLLER_PATH);
const pipeMatch = controllerSource.match(
  /new FileTypePipe\(\[([\s\S]*?)\]\)/,
);
if (!pipeMatch) {
  fail(`Could not find FileTypePipe([...]) allowlist in ${CONTROLLER_PATH}`);
  process.exit(1);
}
const apiExtensions = new Set(
  [...pipeMatch[1].matchAll(/ENUM_FILE_MIME_DOCUMENT\.(\w+)/g)].map((m) => {
    const ext = keyToExtension.get(m[1]);
    if (!ext) fail(`Unknown ENUM_FILE_MIME_DOCUMENT key "${m[1]}" referenced in ${CONTROLLER_PATH}`);
    return `.${ext}`;
  }),
);

// ── 3. apps/app (FE) — createFileSchema's z.file().mime([...]) allowlist ──

const feSource = read(FE_SCHEMA_PATH);
const mimeCallMatch = feSource.match(/\.mime\(\[([\s\S]*?)\]\)/);
if (!mimeCallMatch) {
  fail(`Could not find .mime([...]) allowlist in ${FE_SCHEMA_PATH}`);
  process.exit(1);
}
const feMimes = [
  ...mimeCallMatch[1].matchAll(/"([^"]+)"|'([^']+)'/g),
].map((m) => m[1] || m[2]);
const feExtensions = new Set(
  feMimes.map((mime) => {
    const ext = mimeToExtension.get(mime);
    if (!ext) fail(`Mime "${mime}" in ${FE_SCHEMA_PATH} is not a known ENUM_FILE_MIME_DOCUMENT value`);
    return ext;
  }),
);

// ── 3b. apps/app (FE) — FileForm's formats={[...]} allowlist (second, ──
// independent FE list feeding the same upload input's `accept` attribute) ──

const fileFormSource = read(FE_FILE_FORM_PATH);
const formatsCallMatch = fileFormSource.match(/formats=\{\[([\s\S]*?)\]\}/);
if (!formatsCallMatch) {
  fail(`Could not find formats={[...]} allowlist in ${FE_FILE_FORM_PATH}`);
  process.exit(1);
}
const fileFormMimes = [
  ...formatsCallMatch[1].matchAll(/"([^"]+)"|'([^']+)'/g),
].map((m) => m[1] || m[2]);
const fileFormExtensions = new Set(
  fileFormMimes.map((mime) => {
    const ext = mimeToExtension.get(mime);
    if (!ext) fail(`Mime "${mime}" in ${FE_FILE_FORM_PATH} is not a known ENUM_FILE_MIME_DOCUMENT value`);
    return ext;
  }),
);

// ── 4. apps/ai — SUPPORTED_EXTENSIONS ──

const aiSource = read(AI_TEXT_PROCESSING_PATH);
const aiMatch = aiSource.match(/SUPPORTED_EXTENSIONS\s*=\s*\{([\s\S]*?)\}/);
if (!aiMatch) {
  fail(`Could not find SUPPORTED_EXTENSIONS in ${AI_TEXT_PROCESSING_PATH}`);
  process.exit(1);
}
const aiExtensions = new Set(
  [...aiMatch[1].matchAll(/"\.(\w+)"|'\.(\w+)'/g)].map(
    (m) => `.${m[1] || m[2]}`,
  ),
);

if (process.exitCode) process.exit(1);

// ── Diff all three, pairwise ──

const layers = [
  { name: "apps/api (FileTypePipe)", set: apiExtensions },
  { name: "apps/app (FE schema.ts)", set: feExtensions },
  { name: "apps/app (FE file-form.tsx)", set: fileFormExtensions },
  { name: "apps/ai (SUPPORTED_EXTENSIONS)", set: normalizeExtensions(aiExtensions) },
];

// A layer extracting zero entries almost always means the regex stopped
// matching (e.g. a reformat to a style this parser doesn't expect), not that
// the list is genuinely empty — catch that before it's masked by the diff.
for (const layer of layers) {
  if (layer.set.size === 0) {
    fail(`${layer.name}: extracted 0 file extensions — the parser likely broke, check it against the current source`);
  }
}
if (process.exitCode) process.exit(1);

let ok = true;
for (let i = 0; i < layers.length; i++) {
  for (let j = i + 1; j < layers.length; j++) {
    const a = layers[i];
    const b = layers[j];
    const onlyInA = [...a.set].filter((e) => !b.set.has(e));
    const onlyInB = [...b.set].filter((e) => !a.set.has(e));
    if (onlyInA.length || onlyInB.length) {
      ok = false;
      if (onlyInA.length) {
        fail(`${a.name} supports ${onlyInA.join(", ")} but ${b.name} does not`);
      }
      if (onlyInB.length) {
        fail(`${b.name} supports ${onlyInB.join(", ")} but ${a.name} does not`);
      }
    }
  }
}

if (ok) {
  console.log(
    `✔ Knowledge-base file types in sync across apps/api, apps/app, apps/ai: ${[...apiExtensions].sort().join(", ")}`,
  );
  process.exit(0);
}

process.exit(1);
