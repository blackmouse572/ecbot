import re

# Internal knowledge-base citation labels ("[KB-1]") that must never reach a customer.
KB_ID_PATTERN = r"KB-\d+"
# "[KB-1]", "[KB-1, KB-2]", "[KB-1; KB-2]", with the spaces around it.
CITATION_RE = re.compile(
    rf"(?P<lead>[ \t]*)\[{KB_ID_PATTERN}(?:\s*[,;]\s*{KB_ID_PATTERN})*\](?P<trail>[ \t]*)"
)
# A stream tail that is, or may still grow into, a marker: " [", "[KB-1, K", "[KB-1] ".
CITATION_TAIL_RE = re.compile(r"[ \t]*\[[KB\-\d,;\s]*\]?[ \t]*\Z")
# Longest tail the stream filter holds back before releasing it as plain text.
CITATION_MAX_HELD = 64
