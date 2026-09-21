import os

os.environ.setdefault("POSTGRES_URL", "postgresql://u:p@localhost/x")

from eccho_ai.llm.guardrails.secrets import scan_output_for_secrets


def test_detects_api_key_and_email():
    hits = scan_output_for_secrets("contact a@b.com key sk-ABCDEF0123456789ABCDEF01")
    assert "email" in hits
    assert "api_key" in hits


def test_clean_text_has_no_hits():
    assert scan_output_for_secrets("hello, how can I help?") == []
