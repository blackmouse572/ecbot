// pre-push: refuses to rewrite or delete main. Other branches may still be
// force-pushed (rebasing a PR branch needs it). Git passes one line per ref on
// stdin: <local ref> <local sha> <remote ref> <remote sha>.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const PROTECTED = new Set(["refs/heads/main"]);
const ZERO = /^0+$/;

export function blockedPushes(stdin, isAncestor) {
  return stdin
    .split("\n")
    .filter(Boolean)
    .flatMap((entry) => {
      const [, localSha, remoteRef, remoteSha] = entry.split(" ");

      if (!PROTECTED.has(remoteRef) || ZERO.test(remoteSha)) {
        return [];
      }

      if (ZERO.test(localSha)) {
        return [`deleting ${remoteRef}`];
      }

      return isAncestor(remoteSha, localSha)
        ? []
        : [`rewriting ${remoteRef} (force push)`];
    });
}

function gitIsAncestor(older, newer) {
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", older, newer], {
      stdio: "ignore",
    });

    return true;
  } catch {
    // Not an ancestor, or the remote commit is not even known here.
    return false;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const blocked = blockedPushes(readFileSync(0, "utf8"), gitIsAncestor);

  if (blocked.length) {
    console.error(`Push refused: ${blocked.join(", ")}. Open a PR instead.`);
    process.exit(1);
  }
}
