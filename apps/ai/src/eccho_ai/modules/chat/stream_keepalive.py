"""Keep a quiet SSE stream alive.

The stream runs in its own task and hands frames over through a queue, so a
turn that goes quiet (a tool call, a cold model) still sends a keepalive
comment every `interval` seconds. One task for the whole stream keeps the
agent's context variables consistent from frame to frame.
"""
import asyncio
import contextlib
from collections.abc import AsyncGenerator, AsyncIterator

from eccho_ai.modules.chat.constants import KEEPALIVE_FRAME, KEEPALIVE_INTERVAL_SECONDS

__all__ = ["KEEPALIVE_FRAME", "with_keepalive"]

_END = object()


async def with_keepalive(
    frames: AsyncGenerator[str, None], interval: float = KEEPALIVE_INTERVAL_SECONDS
) -> AsyncIterator[str]:
    queue: asyncio.Queue[object] = asyncio.Queue(maxsize=1)

    async def pump() -> None:
        try:
            # aclosing: when the pump is cancelled while parked on the queue,
            # the stream is closed right away, not left for the GC.
            async with contextlib.aclosing(frames) as stream:
                async for frame in stream:
                    await queue.put(frame)
        except Exception as exc:  # re-raised on the consumer side
            await queue.put(exc)
            return
        await queue.put(_END)

    task = asyncio.create_task(pump())
    try:
        while True:
            try:
                item = await asyncio.wait_for(queue.get(), timeout=interval)
            except TimeoutError:
                yield KEEPALIVE_FRAME
                continue
            if item is _END:
                return
            if isinstance(item, Exception):
                raise item
            yield item  # type: ignore[misc]
    finally:
        # The client left or the stream ended: stop the turn, so it does not
        # keep generating (and billing) for nobody.
        task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await task
