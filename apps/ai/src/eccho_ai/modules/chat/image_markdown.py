"""Screen markdown images (`![alt](url)`) in streamed agent text.

Fallback for when the model writes an image as markdown instead of calling
`send_image`. Every image is taken out of the text: a known URL comes back as
an `Image` piece (sent as a `file` part, like `send_image`), an unknown one is
dropped. Removing an image can join its neighbours into a new one
(`!![x](a)[y](b)` leaves `![y](b)`), so the text is screened again until none
is left, and released text never ends in a fragment that could still open an
image. Text is held back only from such a fragment until it completes.
"""
from __future__ import annotations

import re
from collections.abc import Awaitable, Callable
from dataclasses import dataclass

_IMAGE = re.compile(r"!\[[^\]\n]*\]\(([^)\s]*)\)")
# A trailing fragment that could still grow into an image, with the space
# before it, so `_cut` can still see both sides of an image it removes.
_PARTIAL = re.compile(r" ?!(\[[^\]\n]*(\](\([^)\s]*)?)?)?$")


@dataclass(frozen=True)
class Image:
    url: str


Piece = str | Image


class ImageMarkdownFilter:
    def __init__(self, allowed: Callable[[str], Awaitable[bool]]):
        self._allowed = allowed
        self._buf = ""

    async def feed(self, delta: str) -> list[Piece]:
        self._buf += delta
        return await self._release(final=False)

    async def flush(self) -> list[Piece]:
        return await self._release(final=True)

    async def _release(self, *, final: bool) -> list[Piece]:
        text, images = self._buf, []
        while match := _IMAGE.search(text):
            if await self._allowed(match.group(1)):
                images.append(Image(match.group(1)))
            text = _cut(text, match.start(), match.end())
        partial = None if final else _PARTIAL.search(text)
        cut = partial.start() if partial else len(text)
        ready, self._buf = text[:cut], text[cut:]
        return ([ready] if ready else []) + images


def _cut(text: str, start: int, end: int) -> str:
    """Remove text[start:end], dropping one of two spaces it sat between."""
    if text[start - 1:start] == " " and text[end:end + 1] == " ":
        end += 1
    return text[:start] + text[end:]
