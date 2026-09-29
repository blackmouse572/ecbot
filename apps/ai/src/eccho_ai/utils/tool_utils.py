import re

from eccho_ai.llm.tools.constants import MUTATING_ACTION_VERBS


def is_mutating_action(name: str) -> bool:
    """True when any word of the action name (snake, kebab or camel case) changes data."""
    words = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", name).lower().replace("-", "_").split("_")
    return any(word in MUTATING_ACTION_VERBS for word in words)
