"""Stream filter that removes internal knowledge-base citation markers ("[KB-1]").

Retrieved chunks are labelled [KB-n] in the prompt so the model can tell them
apart. Those labels mean nothing to a customer, so any that reach the reply
are dropped chunk by chunk, holding back a tail that could still be (or grow
into) a marker. The sync endpoint uses `strip_citation_markers` directly.
"""
from eccho_ai.modules.chat.constants import CITATION_MAX_HELD, CITATION_TAIL_RE
from eccho_ai.utils.citation_utils import strip_citation_markers


class CitationMarkerFilter:
    def __init__(self) -> None:
        self._held = ""
        self._line_start = True

    def feed(self, text: str) -> str:
        buffer = self._held + text
        tail = CITATION_TAIL_RE.search(buffer)
        if tail and len(buffer) - tail.start() <= CITATION_MAX_HELD:
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
