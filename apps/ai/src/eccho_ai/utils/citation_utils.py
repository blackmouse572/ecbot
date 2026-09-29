import re

from eccho_ai.modules.chat.constants import CITATION_RE


def strip_citation_markers(text: str, *, line_start: bool = True) -> str:
    """Remove [KB-n] markers. `line_start`: whether `text` begins a line."""

    def replace(match: re.Match[str]) -> str:
        start = match.start()
        at_line_start = (start == 0 and line_start) or (start > 0 and text[start - 1] == "\n")
        # "[KB-1] Next" -> "Next"; "450k [KB-1]." -> "450k."; "a [KB-1] b" -> "a b"
        return "" if at_line_start else match.group("trail")

    return CITATION_RE.sub(replace, text)
