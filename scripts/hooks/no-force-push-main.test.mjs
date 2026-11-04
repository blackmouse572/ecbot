import assert from "node:assert/strict";
import { test } from "node:test";

import { blockedPushes } from "./no-force-push-main.mjs";

const Z = "0".repeat(40);
const isAncestor = (older, newer) => older === "a" && newer === "b";

test("allows a fast-forward push to main", () => {
  assert.deepEqual(
    blockedPushes("refs/heads/main b refs/heads/main a", isAncestor),
    [],
  );
});

test("blocks a push that rewrites main", () => {
  assert.equal(
    blockedPushes("refs/heads/main c refs/heads/main a", isAncestor).length,
    1,
  );
});

test("blocks deleting main", () => {
  assert.equal(
    blockedPushes(`(delete) ${Z} refs/heads/main a`, isAncestor).length,
    1,
  );
});

test("allows creating main and force pushes to other branches", () => {
  assert.deepEqual(
    blockedPushes(
      `refs/heads/main b refs/heads/main ${Z}\nrefs/heads/x c refs/heads/feature a`,
      isAncestor,
    ),
    [],
  );
});
