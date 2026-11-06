import { execFileSync } from "node:child_process";
import type { Plugin } from "vite";

const UNKNOWN = "unknown";

export type BuildInfo = {
  commit: string;
  branch: string;
  builtAt: string;
  /** This repo's own commit when it is built as a submodule (e.g. `core/`). */
  coreCommit?: string;
};

type Git = (args: string[], cwd: string) => string;

const runGit: Git = (args, cwd) =>
  execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();

/**
 * Which commit is being built. Cloudflare Workers Builds sets
 * WORKERS_CI_COMMIT_SHA / WORKERS_CI_BRANCH for the repo it cloned; elsewhere
 * we ask git, and when this app sits in a submodule the commit that counts is
 * the superproject's, with the submodule's own kept as `coreCommit`.
 */
export function readBuildInfo({
  env = process.env,
  git = runGit,
  cwd = process.cwd(),
  now = new Date(),
}: {
  env?: Record<string, string | undefined>;
  git?: Git;
  cwd?: string;
  now?: Date;
} = {}): BuildInfo {
  const tryGit = (args: string[], dir: string) => {
    try {
      return git(args, dir) || undefined;
    } catch {
      return undefined;
    }
  };

  const ownCommit = tryGit(["rev-parse", "HEAD"], cwd);

  const superproject = tryGit(
    ["rev-parse", "--show-superproject-working-tree"],
    cwd,
  );

  const root = superproject ?? cwd;

  const gitBranch = tryGit(["rev-parse", "--abbrev-ref", "HEAD"], root);

  const info: BuildInfo = {
    commit:
      env.WORKERS_CI_COMMIT_SHA ||
      (superproject ? tryGit(["rev-parse", "HEAD"], root) : ownCommit) ||
      UNKNOWN,
    branch:
      env.WORKERS_CI_BRANCH ||
      (gitBranch && gitBranch !== "HEAD" ? gitBranch : UNKNOWN),
    builtAt: now.toISOString(),
  };

  if (superproject && ownCommit) {
    info.coreCommit = ownCommit;
  }

  return info;
}

/**
 * Emits `build-info.json` next to the client assets, so anyone can read which
 * commit is live at `/build-info.json`. `public/_headers` serves it no-store.
 */
export function buildInfo(): Plugin {
  return {
    name: "build-info",
    apply: "build",
    applyToEnvironment: (environment) => environment.name === "client",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "build-info.json",
        source: `${JSON.stringify(readBuildInfo(), null, 2)}\n`,
      });
    },
  };
}
