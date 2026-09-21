from eccho_ai.core.variables import _AppVars


def test_openrouter_defaults():
    v = _AppVars()
    assert v.OPENROUTER_BASE_URL == "https://openrouter.ai/api/v1"
    assert v.GUARDRAIL_MODEL == "google/gemini-2.5-flash"
    assert v.CLASSIFIER_MODEL == "google/gemini-2.5-flash"
    assert v.IMAGE_MODEL == "google/gemini-2.5-flash-image"
    assert not hasattr(v, "CUSTOMER_CLASSIFIER_PROVIDER")
