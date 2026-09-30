import asyncio

import pytest

from eccho_ai.modules.chat.stream_keepalive import KEEPALIVE_FRAME, with_keepalive


async def _collect(frames):
    return [f async for f in frames]


async def test_passes_frames_through_in_order():
    async def frames():
        yield "data: a\n\n"
        yield "data: b\n\n"

    assert await _collect(with_keepalive(frames(), interval=1)) == [
        "data: a\n\n",
        "data: b\n\n",
    ]


async def test_sends_keepalives_while_the_turn_is_quiet():
    async def frames():
        yield "data: a\n\n"
        await asyncio.sleep(0.05)  # a tool roundtrip or a cold start
        yield "data: b\n\n"

    out = await _collect(with_keepalive(frames(), interval=0.01))

    assert out[0] == "data: a\n\n"
    assert out[-1] == "data: b\n\n"
    assert out[1:-1].count(KEEPALIVE_FRAME) >= 2
    assert set(out[1:-1]) == {KEEPALIVE_FRAME}


async def test_keepalive_is_an_sse_comment():
    assert KEEPALIVE_FRAME.startswith(":")
    assert KEEPALIVE_FRAME.endswith("\n\n")


async def test_raises_what_the_stream_raised():
    async def frames():
        yield "data: a\n\n"
        raise RuntimeError("boom")

    with pytest.raises(RuntimeError, match="boom"):
        await _collect(with_keepalive(frames(), interval=1))


async def test_closing_early_stops_the_turn():
    stopped = asyncio.Event()

    async def frames():
        try:
            yield "data: a\n\n"
            await asyncio.sleep(10)
            yield "data: never\n\n"
        finally:
            stopped.set()

    stream = with_keepalive(frames(), interval=1)
    assert await anext(stream) == "data: a\n\n"
    await stream.aclose()

    await asyncio.wait_for(stopped.wait(), timeout=1)
