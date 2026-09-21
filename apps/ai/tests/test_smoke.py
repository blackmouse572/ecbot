"""Bootstrap smoke test — exists primarily so the pytest harness is exercised in
CI before anyone writes real tests against the FastAPI surface.

For #172 there's no apps/ai change to cover. Replace this file with real tests
when #174 / #176 (ai-side customer summary jobs) land.
"""
from __future__ import annotations

import pytest

pytestmark = pytest.mark.integration


@pytest.mark.asyncio
async def test_health_endpoint_returns_200(async_client) -> None:
    response = await async_client.get("/health")
    assert response.status_code == 200
    body = response.json()
    # AppResponse has a status field — confirm it's a healthy default.
    assert body.get("status") in (200, "200", None) or body.get("msg") in (
        "OK",
        "Success",
        None,
    )
