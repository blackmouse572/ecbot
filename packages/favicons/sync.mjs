// Copies the right per-env favicon set (./dev, ./staging, ./production) into
// a consuming app's public/favicon dir. Run at dev-server/build start so each
// app always ships the favicon matching the environment it's running as.
import { copyFileSync, mkdirSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const ENVS = ["dev", "staging", "production"];

/**
 * @param {string} env - "dev" | "staging" | "production" (unrecognized -> "dev")
 * @param {string} targetDir - absolute path to the app's public/favicon dir
 */
export function syncFavicon(env, targetDir) {
  const resolvedEnv = ENVS.includes(env) ? env : "dev";
  const sourceDir = path.join(rootDir, resolvedEnv);

  mkdirSync(targetDir, { recursive: true });
  for (const file of readdirSync(sourceDir)) {
    copyFileSync(path.join(sourceDir, file), path.join(targetDir, file));
  }
}
