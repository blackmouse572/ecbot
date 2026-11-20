"""Prompt sources for one arm of a run: the AGENT.md template and the agent
builder (`packages/agent-blueprint`), from the working tree or a git ref.

The builder is TypeScript, so each arm's copy is built with the package's own
tsc into eval/.cache and run with node (compile_profile.cjs).
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path

from eval.regression.cases import Case

AI_DIR = Path(__file__).resolve().parents[2]
REPO = AI_DIR.parents[1]
BLUEPRINT = REPO / "packages" / "agent-blueprint"
AGENT_MD = "apps/ai/src/eccho_ai/llm/prompts/AGENT.md"
CACHE = AI_DIR / "eval" / ".cache"
COMPILE_JS = Path(__file__).resolve().parent / "compile_profile.cjs"


@dataclass(frozen=True)
class Arm:
    name: str  # "working tree" or the git ref
    template: str  # AGENT.md
    dist: Path  # built agent-blueprint entry (dist/index.js)


@dataclass(frozen=True)
class Compiled:
    general_knowledge: str
    followup_rules: str


def _git(*args: str) -> bytes:
    return subprocess.run(["git", "-C", str(REPO), *args], check=True, capture_output=True).stdout


def _build(src: Path) -> Path:
    """tsc the package at `src` (its src/ and locales/) into src/dist."""
    tsc = BLUEPRINT / "node_modules" / ".bin" / "tsc"
    if not tsc.exists():
        raise SystemExit("agent-blueprint has no node_modules: run `pnpm install` at the repo root first")
    shutil.rmtree(src / "dist", ignore_errors=True)
    entries = [str(p) for p in (src / "src").glob("*.ts") if not p.name.endswith(".test.ts")]
    subprocess.run(
        [str(tsc), "--outDir", str(src / "dist"), "--rootDir", str(src / "src"),
         "--module", "commonjs", "--moduleResolution", "node", "--target", "es2022",
         "--esModuleInterop", "--resolveJsonModule", "--skipLibCheck", "--noCheck", *entries],
        check=True,
        capture_output=True,
    )
    return src / "dist" / "index.js"


def working_tree_arm() -> Arm:
    dest = CACHE / "blueprint" / "working-tree"
    shutil.rmtree(dest, ignore_errors=True)
    for part in ("src", "locales"):
        shutil.copytree(BLUEPRINT / part, dest / part)
    template = (REPO / AGENT_MD).read_text(encoding="utf-8")
    return Arm("working tree", template, _build(dest))


def ref_arm(ref: str) -> Arm:
    sha = _git("rev-parse", "--short", ref).decode().strip()
    dest = CACHE / "blueprint" / sha
    shutil.rmtree(dest, ignore_errors=True)
    dest.mkdir(parents=True)
    # The archive is our own repo's history: tar unpacks it as git wrote it.
    archive = _git("archive", sha, "packages/agent-blueprint/src", "packages/agent-blueprint/locales")
    subprocess.run(["tar", "-x", "-C", str(dest)], input=archive, check=True)
    pkg = dest / "packages" / "agent-blueprint"
    template = _git("show", f"{sha}:{AGENT_MD}").decode("utf-8")
    return Arm(f"{ref} ({sha})", template, _build(pkg))


def compile_profiles(arm: Arm, cases: list[Case]) -> dict[str, Compiled]:
    """general_knowledge + followup_rules per case key, in one node call."""
    payload = {
        "dist": str(arm.dist),
        "profiles": [
            {"type": c.agent_type, "lang": c.lang, "overrides": c.profile, "extraInstructions": c.extra_instructions}
            for c in cases
        ],
    }
    env = {**os.environ, "NODE_PATH": str(BLUEPRINT / "node_modules")}
    out = subprocess.run(
        ["node", str(COMPILE_JS)], input=json.dumps(payload), text=True,
        capture_output=True, env=env,
    )
    if out.returncode != 0:
        raise SystemExit(f"compilePrompt failed:\n{out.stderr}")
    compiled = json.loads(out.stdout)
    return {
        c.key: Compiled(r["generalKnowledge"], r["followupRules"]) for c, r in zip(cases, compiled)
    }
