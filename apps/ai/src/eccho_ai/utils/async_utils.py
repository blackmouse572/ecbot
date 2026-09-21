import asyncio
from typing import Dict, TypeVar, Callable, Any, Awaitable, Coroutine, cast, Optional
from typing_extensions import ParamSpec
from anyio import from_thread
from functools import wraps

from eccho_ai.core.variables import AppVars


T = TypeVar("T")
P = ParamSpec("P")
_SEMAPHORE_REGISTRY: Dict[Any, asyncio.Semaphore] = {}


def run_async_func(
    func: Callable[P, Awaitable[T]],
    limit: int = AppVars.MAX_CONCURRENT_REQUESTS,
    *args: P.args,
    **kwargs: P.kwargs,
) -> T:
    """
    Runs an async function synchronously. 
    Includes optional semaphore support and fixes Pylance type errors.
    """
    async def wrapped_logic() -> T:
        if func not in _SEMAPHORE_REGISTRY:
            _SEMAPHORE_REGISTRY[func] = asyncio.Semaphore(limit)
        sem = _SEMAPHORE_REGISTRY[func]
        async with sem:
            return await func(*args, **kwargs)

    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop and loop.is_running():
        # Using anyio to bridge back to the running loop
        return from_thread.run(wrapped_logic)
    else:
        return asyncio.run(cast(Coroutine[Any, Any, T], wrapped_logic()))


def to_sync(
    limit: int = AppVars.MAX_CONCURRENT_REQUESTS
) -> Callable[[Callable[P, Awaitable[T]]], Callable[P, T]]:
    """
    Decorator to convert an async function to a sync one with optional concurrency limiting.
    """
    def decorator(func: Callable[P, Awaitable[T]]) -> Callable[P, T]:
        @wraps(func)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            return run_async_func(func, limit=limit, *args, **kwargs)
        return wrapper
    return decorator