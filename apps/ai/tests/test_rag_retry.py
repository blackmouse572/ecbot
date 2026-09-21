import os

# Set required env vars before any module imports that trigger AppVars validation.
os.environ.setdefault("POSTGRES_URL", "postgresql://test:test@localhost:5432/test")

import pytest
from eccho_ai.llm.retrievers.retry import _retryable  # helper predicate we will add


def test_retryable_true_for_transient():
    assert _retryable(TimeoutError("boom")) is True


def test_retryable_false_for_value_error():
    assert _retryable(ValueError("bad input")) is False
