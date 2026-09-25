"""Markdown-image fallback: unverified image links never reach the customer."""
from eccho_ai.modules.chat.image_markdown import ImageMarkdownFilter

KNOWN = "https://cdn/shirt.jpg"


async def _allowed(url: str) -> bool:
    return url == KNOWN


async def _run(chunks: list[str]) -> str:
    f = ImageMarkdownFilter(_allowed)
    out = [await f.feed(c) for c in chunks]
    return "".join(out) + await f.flush()


async def test_plain_text_passes_through_immediately():
    f = ImageMarkdownFilter(_allowed)
    assert await f.feed("Xin chào") == "Xin chào"


async def test_known_image_is_kept_even_when_split_across_chunks():
    text = await _run(["Đây ạ !", "[Áo](https://cdn/", "shirt.jpg) nhé"])
    assert text == f"Đây ạ ![Áo]({KNOWN}) nhé"


async def test_unknown_image_is_dropped():
    assert await _run(["See ![x](https://evil/x.jpg) ok"]) == "See  ok"


async def test_a_lone_exclamation_is_released_at_flush():
    assert await _run(["Wow!"]) == "Wow!"
