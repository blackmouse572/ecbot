import os

os.environ.setdefault("POSTGRES_URL", "postgresql://u:p@localhost/x")

from eccho_ai.llm.retrievers.text_processing import normalize_text


def test_strips_zero_width_and_script():
    dirty = "Legit​ text﻿ <script>alert(1)</script> end"
    clean = normalize_text(dirty)
    assert "​" not in clean
    assert "﻿" not in clean
    assert "script" not in clean.lower()
    assert "Legit text" in clean
