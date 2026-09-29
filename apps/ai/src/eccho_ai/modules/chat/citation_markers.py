"""Removes internal knowledge-base citation markers ("[KB-1]") from replies.

Retrieved chunks are labelled [KB-n] in the prompt so the model can tell them
apart. Those labels mean nothing to a customer, so any that reach the reply
are dropped: in one pass for the sync endpoint, and chunk by chunk on the
stream, holding back a tail that could still be (or grow into) a marker.
"""
import re

_KB_ID = r"KB-\d+"
# "[KB-1]", "[KB-1, KB-2]", "[KB-1; KB-2]", with the spaces around it.
CITATION_RE = re.compile(rf"(?P<lead>[ \t]*)\[{_KB_ID}(?:\s*[,;]\s*{_KB_ID})*\](?P<trail>[ \t]*)")
# A tail that is, or may still grow into, a marker: " [", "[KB-1, K", "[KB-1] ".
_TAIL_RE = re.compile(r"[ \t]*\[[KB\-\d,;\s]*\]?[ \t]*\Z")
_MAX_HELD = 64


def strip_citation_markers(text: str, *, line_start: bool = True) -> str:
    """`line_start`: whether `text` begins at the start of a line."""

    def replace(match: re.Match[str]) -> str:
        start = match.start()
        at_line_start = (start == 0 and line_start) or (start > 0 and text[start - 1] == "\n")
        # "[KB-1] Next" -> "Next"; "450k [KB-1]." -> "450k."; "a [KB-1] b" -> "a b"
        return "" if at_line_start else match.group("trail")

    return CITATION_RE.sub(replace, text)


class CitationMarkerFilter:
    def __init__(self) -> None:
        self._held = ""
        self._line_start = True

    def feed(self, text: str) -> str:
        buffer = self._held + text
        tail = _TAIL_RE.search(buffer)
        if tail and len(buffer) - tail.start() <= _MAX_HELD:
            head, self._held = buffer[: tail.start()], buffer[tail.start():]
        else:
            head, self._held = buffer, ""
        return self._emit(head)

    def flush(self) -> str:
        held, self._held = self._held, ""
        return self._emit(held)

    def _emit(self, text: str) -> str:
        out = strip_citation_markers(text, line_start=self._line_start)
        if out:
            self._line_start = out.endswith("\n")
        return out
