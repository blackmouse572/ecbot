"""Screen markdown images (`![alt](url)`) in streamed agent text.

Fallback for when the model writes an image as markdown instead of calling
`send_image`: known URLs are kept (apps/api turns them into image messages),
unknown ones are dropped before they reach anyone. Text is buffered only from
a `!` that might open an image until that image is complete.
"""
from __future__ import annotations

import re
from collections.abc import Awaitable, Callable

_IMAGE = re.compile(r"!\[[^\]\n]*\]\(([^)\s]*)\)")
# A trailing fragment that could still grow into an image.
_PARTIAL = re.compile(r"!(\[[^\]\n]*(\](\([^)\s]*)?)?)?$")


class ImageMarkdownFilter:
    def __init__(self, allowed: Callable[[str], Awaitable[bool]]):
        self._allowed = allowed
        self._buf = ""

    async def feed(self, delta: str) -> str:
        self._buf += delta
        cut = self._hold_from()
        ready, self._buf = self._buf[:cut], self._buf[cut:]
        return await self._screen(ready)

    async def flush(self) -> str:
        ready, self._buf = self._buf, ""
        return await self._screen(ready)

    def _hold_from(self) -> int:
        partial = _PARTIAL.search(self._buf)
        return partial.start() if partial else len(self._buf)

    async def _screen(self, text: str) -> str:
        out, last = [], 0
        for m in _IMAGE.finditer(text):
            out.append(text[last:m.start()])
            if await self._allowed(m.group(1)):
                out.append(m.group(0))
            last = m.end()
        out.append(text[last:])
        return "".join(out)
