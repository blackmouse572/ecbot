import re

_PATTERNS = {
    "email": re.compile(r"\b[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}\b"),
    "api_key": re.compile(r"\b(sk|pk|rk)[-_][A-Za-z0-9]{16,}\b"),
    "bearer": re.compile(r"\bBearer\s+[A-Za-z0-9._-]{20,}\b", re.IGNORECASE),
    "phone": re.compile(r"\b(?:\+?84|0)\d{9,10}\b"),
    "github": re.compile(r"\b(ghp|gho|ghs)_[A-Za-z0-9]{36,}\b"),
    "openai_project": re.compile(r"\bsk-proj-[A-Za-z0-9_-]{20,}\b"),
    "aws_key": re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
    "slack": re.compile(r"\b(xoxb|xoxp)-[0-9A-Za-z-]{20,}\b"),
    "jwt": re.compile(r"\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b"),
}


def scan_output_for_secrets(text: str) -> list[str]:
    if not text:
        return []
    return [name for name, pattern in _PATTERNS.items() if pattern.search(text)]
