"""Shared tenacity retry policy for RAG ingest + retrieval network calls."""
from tenacity import retry_if_exception, stop_after_attempt, wait_exponential


def _retryable(exc: BaseException) -> bool:
    """Return True if the exception is transient and should be retried."""
    if isinstance(exc, ValueError):
        return False
    message = str(exc).lower()
    if any(code in message for code in ("429", "503", "500", "timeout", "temporarily")):
        return True
    return isinstance(exc, (TimeoutError, ConnectionError))


_RETRY = dict(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=10),
    retry=retry_if_exception(_retryable),
    reraise=True,
)
