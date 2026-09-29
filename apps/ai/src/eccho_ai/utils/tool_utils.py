import re

from eccho_ai.llm.tools.constants import MUTATING_ACTION_VERBS


def is_mutating_action(name: str) -> bool:
    """True when the action's first word (snake, kebab or camel case) changes data."""
    words = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", name).lower().replace("-", "_").split("_")
    return bool(words) and words[0] in MUTATING_ACTION_VERBS
