"""Scenario files (eval/scenarios/*.yaml) expanded into one Case per language.

A scenario file names an agent from `_agents.yaml` and lists cases. Every
text a case carries (message, history, regexes) is given per language, so a
case runs once for each language it has a message in.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml

SCENARIOS_DIR = Path(__file__).resolve().parent.parent / "scenarios"
AGENTS_FILE = "_agents.yaml"

# apps/api writes these into the history it sends (turn-context.service.ts,
# conversation/constants/message.constant.ts).
STAFF_LABEL = "[Staff]"
STAFF_HANDLED_NOTE = (
    "[Handled by staff] Staff took care of what was handed over and switched you back on."
)


@dataclass(frozen=True)
class Tag:
    name: str
    description: str = ""
    emoji: str | None = None
    handoff: bool = False
    notify: bool = False


@dataclass(frozen=True)
class Case:
    area: str
    id: str
    lang: str
    agent_type: str
    profile: dict[str, Any]
    extra_instructions: str | None
    orders: bool
    tags: tuple[Tag, ...]
    customer: dict[str, Any]
    history: tuple[tuple[str, str], ...]  # (role, content) as apps/api sends it
    message: str
    expect: tuple[dict[str, Any], ...]
    min_pass: float = 0.67
    note: str = ""
    tool_results: dict[str, Any] = field(default_factory=dict)

    @property
    def key(self) -> str:
        return f"{self.area}/{self.id}/{self.lang}"

    @property
    def handoff_tags(self) -> set[str]:
        return {t.name for t in self.tags if t.handoff}


def _pick(value: Any, lang: str) -> Any:
    """A per-language mapping gives its `lang` entry; anything else is shared."""
    if isinstance(value, dict) and set(value) <= {"vi", "en"}:
        return value.get(lang)
    return value


def _history(entries: list[dict[str, str]], lang: str) -> tuple[tuple[str, str], ...]:
    out: list[tuple[str, str]] = []
    for entry in entries:
        if isinstance(entry, list):  # a shared history (YAML anchor) spliced in
            out.extend(_history(entry, lang))
            continue
        (who, text), = entry.items()
        text = _pick(text, lang)
        if who == "customer":
            out.append(("user", text))
        elif who == "bot":
            out.append(("assistant", text))
        elif who == "staff":
            out.append(("assistant", f"{STAFF_LABEL} {text}"))
        elif who == "handled":
            out.append(("user", STAFF_HANDLED_NOTE))
        else:
            raise ValueError(f"unknown history role {who!r} (customer, bot, staff, handled)")
    return tuple(out)


def _expect(checks: list[dict[str, Any]], lang: str) -> tuple[dict[str, Any], ...]:
    return tuple({k: _pick(v, lang) for k, v in check.items()} for check in checks)


def load_agents(directory: Path = SCENARIOS_DIR) -> dict[str, dict[str, Any]]:
    return yaml.safe_load((directory / AGENTS_FILE).read_text(encoding="utf-8"))


def load_cases(directory: Path = SCENARIOS_DIR) -> list[Case]:
    agents = load_agents(directory)
    cases: list[Case] = []
    for path in sorted(directory.glob("*.yaml")):
        if path.name == AGENTS_FILE:
            continue
        doc = yaml.safe_load(path.read_text(encoding="utf-8"))
        area = doc.get("area") or path.stem
        for raw in doc["cases"]:
            agent = agents[raw.get("agent", doc["agent"])]
            for lang in ("vi", "en"):
                message = _pick(raw["message"], lang)
                if not message:
                    continue
                cases.append(
                    Case(
                        area=area,
                        id=raw["id"],
                        lang=lang,
                        agent_type=agent["type"],
                        profile={**agent[lang], **(_pick(raw.get("profile"), lang) or {})},
                        extra_instructions=_pick(agent.get("extra_instructions"), lang),
                        orders=bool(raw.get("orders", agent.get("orders", False))),
                        tags=tuple(Tag(**t) for t in agent["tags"][lang]),
                        customer={**(_pick(raw.get("customer"), lang) or {})},
                        history=_history(raw.get("history", []), lang),
                        message=message,
                        expect=_expect(raw["expect"], lang),
                        min_pass=float(raw.get("min_pass", doc.get("min_pass", 0.67))),
                        note=raw.get("note", ""),
                        tool_results=raw.get("tool_results", {}),
                    )
                )
    keys = [c.key for c in cases]
    duplicates = {k for k in keys if keys.count(k) > 1}
    if duplicates:
        raise ValueError(f"duplicate case ids: {sorted(duplicates)}")
    return cases


def select(cases: list[Case], only: str | None, langs: list[str] | None) -> list[Case]:
    """`only` is a comma list of `area` or `area/case_id`."""
    picked = cases
    if only:
        wanted = [w.strip() for w in only.split(",") if w.strip()]
        picked = [
            c for c in picked
            if any(c.area == w or f"{c.area}/{c.id}" == w for w in wanted)
        ]
    if langs:
        picked = [c for c in picked if c.lang in langs]
    return picked
