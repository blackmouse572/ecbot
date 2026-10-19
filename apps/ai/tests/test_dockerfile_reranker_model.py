"""The Dockerfile bakes the reranker model so no chat waits on its download.

The baked name is a build ARG; it must match the model the service loads
(`RAG_RERANK_CROSS_ENCODER_MODEL`), or every new instance downloads the real
one during its first chat again.
"""
import os

os.environ.setdefault("POSTGRES_URL", "postgresql://u:p@localhost/x")

import re
from pathlib import Path

from eccho_ai.core.variables import _AppVars

DOCKERFILE = Path(__file__).resolve().parents[1] / "Dockerfile"


def test_baked_reranker_matches_configured_model():
    match = re.search(r"^ARG RERANK_MODEL=(\S+)$", DOCKERFILE.read_text(), re.M)
    assert match, "Dockerfile no longer declares ARG RERANK_MODEL"
    configured = _AppVars.model_fields["RAG_RERANK_CROSS_ENCODER_MODEL"].default
    assert match.group(1) == configured
