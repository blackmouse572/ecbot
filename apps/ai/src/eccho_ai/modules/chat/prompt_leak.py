"""Stops a reply that starts reproducing the system prompt.

Some models (seen with gemini-2.5-flash-lite) mirror the XML frame of
AGENT.md: they open with `<agent>` and go on to copy the prompt, config and
customer context before answering. Every streamed text chunk reaches the
customer, so the stream is screened here and cut at the first marker.
"""

PROMPT_LEAK_REASON = "prompt_leak"

# Distinctive pieces of the rendered system prompt (AGENT.md) and of the
# customer-context system message. A customer reply has no reason to contain
# any of them.
PROMPT_MARKERS: tuple[str, ...] = (
    "<agent>",
    "</agent>",
    "<system_rules>",
    "</system_rules>",
    "<operator_instructions>",
    "</operator_instructions>",
    "<config>",
    "</config>",
    "<precedence>",
    "<untrusted_input>",
    "# customer context",
    "# tag catalog",
)


class PromptLeakFilter:
    """Releases streamed text, holding back a tail that could still grow into
    a marker, so a marker split across chunks is never partly sent."""

    def __init__(self, markers: tuple[str, ...] = PROMPT_MARKERS) -> None:
        self._markers = tuple(m.lower() for m in markers)
        self._held = ""

    def feed(self, text: str) -> str | None:
        """Text safe to send now, or None once a marker has appeared."""
        buffer = self._held + text
        lowered = buffer.lower()
        if any(marker in lowered for marker in self._markers):
            self._held = ""
            return None
        keep = self._partial_marker_length(lowered)
        self._held = buffer[len(buffer) - keep:] if keep else ""
        return buffer[: len(buffer) - keep]

    def flush(self) -> str:
        """End of a text run: the held tail never became a marker."""
        held, self._held = self._held, ""
        return held

    def _partial_marker_length(self, lowered: str) -> int:
        """Length of the longest buffer suffix that is a proper prefix of a marker."""
        longest = 0
        for marker in self._markers:
            for size in range(min(len(marker) - 1, len(lowered)), longest, -1):
                if lowered.endswith(marker[:size]):
                    longest = size
                    break
        return longest
