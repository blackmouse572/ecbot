"""Removes internal knowledge-base citation markers ("[KB-1]") from replies.

Retrieved chunks are labelled [KB-n] in the prompt so the model can tell them
apart. Those labels mean nothing to a customer, so any that reach the reply
are dropped: in one pass for the sync endpoint, and chunk by chunk on the
stream, holding back a tail that could still grow into a marker.
"""
import re

_KB_ID = r"KB-\d+"
# "[KB-1]", "[KB-1, KB-2]", "[KB-1; KB-2]", plus the spaces before it.
CITATION_RE = re.compile(rf"[ \t]*\[{_KB_ID}(?:\s*[,;]\s*{_KB_ID})*\]")
# A tail that is still a prefix of a marker, e.g. " [", "[KB", "[KB-1, K".
_PARTIAL_RE = re.compile(r"[ \t]*\[(?:[KB\-\d,;\s]*)$")
_MAX_HELD = 64


def strip_citation_markers(text: str) -> str:
    return CITATION_RE.sub("", text)


class CitationMarkerFilter:
    def __init__(self) -> None:
        self._held = ""

    def feed(self, text: str) -> str:
        buffer = strip_citation_markers(self._held + text)
        partial = _PARTIAL_RE.search(buffer)
        if partial and len(buffer) - partial.start() <= _MAX_HELD:
            self._held = buffer[partial.start():]
            return buffer[: partial.start()]
        self._held = ""
        return buffer

    def flush(self) -> str:
        held, self._held = self._held, ""
        return held
