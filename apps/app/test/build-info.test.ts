import { describe, expect, it } from "vitest";
import { readBuildInfo } from "../build-info";

const NOW = new Date("2026-11-06T09:00:00.000Z");

// A fake `git`: maps "<cwd> <args>" to stdout, throws (like a missing repo)
// for anything it was not told about.
function fakeGit(answers: Record<string, string>) {
  return (args: string[], cwd: string) => {
    const key = `${cwd} ${args.join(" ")}`;

    if (!(key in answers)) throw new Error(`not a git repository: ${key}`);

    return answers[key];
  };
}

describe("readBuildInfo", () => {
  it("prefers the Workers Builds commit and branch", () => {
    const info = readBuildInfo({
      env: { WORKERS_CI_COMMIT_SHA: "ci-sha", WORKERS_CI_BRANCH: "main" },
      git: fakeGit({ "/app rev-parse HEAD": "local-sha" }),
      cwd: "/app",
      now: NOW,
    });

    expect(info).toEqual({
      commit: "ci-sha",
      branch: "main",
      builtAt: "2026-11-06T09:00:00.000Z",
    });
  });

  it("falls back to git, and adds the submodule's own commit", () => {
    const info = readBuildInfo({
      env: {},
      git: fakeGit({
        "/repo/core/apps/app rev-parse HEAD": "core-sha",
        "/repo/core/apps/app rev-parse --show-superproject-working-tree":
          "/repo",
        "/repo rev-parse HEAD": "super-sha",
        "/repo rev-parse --abbrev-ref HEAD": "release",
      }),
      cwd: "/repo/core/apps/app",
      now: NOW,
    });

    expect(info).toEqual({
      commit: "super-sha",
      branch: "release",
      builtAt: "2026-11-06T09:00:00.000Z",
      coreCommit: "core-sha",
    });
  });

  it("says unknown without CI variables or git, and on a detached HEAD", () => {
    expect(
      readBuildInfo({ env: {}, git: fakeGit({}), cwd: "/app", now: NOW }),
    ).toEqual({
      commit: "unknown",
      branch: "unknown",
      builtAt: "2026-11-06T09:00:00.000Z",
    });

    expect(
      readBuildInfo({
        env: {},
        git: fakeGit({
          "/app rev-parse HEAD": "sha",
          "/app rev-parse --show-superproject-working-tree": "",
          "/app rev-parse --abbrev-ref HEAD": "HEAD",
        }),
        cwd: "/app",
        now: NOW,
      }).branch,
    ).toBe("unknown");
  });
});
