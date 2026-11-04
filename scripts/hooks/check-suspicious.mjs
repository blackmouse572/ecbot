// Blocks added lines that hide code: base64 decoded and then run, remote
// scripts piped to a shell, or long base64 blobs in source files.
//   node scripts/hooks/check-suspicious.mjs            staged changes (pre-commit)
//   node scripts/hooks/check-suspicious.mjs A B        changes from commit A to B (CI)
// Put `allow-base64` on a line to let a reviewed blob through.
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const SKIP_FILES = [
  /(^|\/)pnpm-lock\.yaml$/,
  /(^|\/)uv\.lock$/,
  /\.(svg|snap|map)$/,
  /\.min\.(js|css)$/,
  /\.gen\.ts$/,
  /(^|\/)migrations\/\.snapshot-[^/]*$/,
  // Its fixtures are the patterns this script looks for.
  /(^|\/)scripts\/hooks\/check-suspicious\.test\.mjs$/,
];

const DECODE = String.raw`(atob\s*\(|base64['"]|fromCharCode)`;
const RUN = String.raw`\b(eval|Function|exec|execSync|execFile|execFileSync|spawn|spawnSync|runInThisContext|runInNewContext)\s*\(`;

const RULES = [
  {
    reason: "decodes base64 and runs it",
    test: (text) => new RegExp(`${RUN}.*${DECODE}`).test(text),
  },
  {
    reason: "pipes decoded or downloaded content into a shell",
    test: (text) =>
      /(base64\s+(-d|--decode)\s*|\b(curl|wget)\b[^|]*)\|\s*(sudo\s+)?(ba|z)?sh\b/.test(
        text,
      ),
  },
  {
    reason: "long base64 blob",
    test: (text) => /[A-Za-z0-9+/]{200,}={0,2}/.test(text),
  },
];

export function findSuspicious(lines) {
  return lines.flatMap(({ file, line, text }) => {
    if (
      SKIP_FILES.some((pattern) => pattern.test(file)) ||
      text.includes("allow-base64")
    ) {
      return [];
    }

    const rule = RULES.find(({ test }) => test(text));

    return rule ? [{ file, line, reason: rule.reason }] : [];
  });
}

export function parseAddedLines(diff) {
  const lines = [];
  let file = "";
  let next = 0;

  for (const raw of diff.split("\n")) {
    if (raw.startsWith("+++ ")) {
      file = raw.replace(/^\+\+\+ (b\/)?/, "");
    } else if (raw.startsWith("@@")) {
      next = Number(/\+(\d+)/.exec(raw)?.[1] ?? 0);
    } else if (raw.startsWith("+")) {
      lines.push({ file, line: next, text: raw.slice(1) });
      next += 1;
    }
  }

  return lines;
}

function main(range) {
  const args = [
    "diff",
    "--no-color",
    "--no-ext-diff",
    "-U0",
    "--no-renames",
    "--diff-filter=AM",
  ];
  const diff = execFileSync(
    "git",
    range.length ? [...args, ...range] : [...args, "--cached"],
    {
      encoding: "utf8",
      maxBuffer: 256 * 1024 * 1024,
    },
  );
  const hits = findSuspicious(parseAddedLines(diff));

  for (const { file, line, reason } of hits) {
    console.error(`${file}:${line}: ${reason}`);
  }

  if (hits.length) {
    console.error(
      "\nRemove it, or add `allow-base64` to the line once it has been reviewed.",
    );
    process.exit(1);
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main(process.argv.slice(2));
}
