"""Markdown-image screen: allowed images leave the text as image pieces, and no
image the screen did not check can ever reach anyone."""
from eccho_ai.modules.chat.image_markdown import Image, ImageMarkdownFilter

KNOWN = "https://cdn/shirt.jpg"


async def _allowed(url: str) -> bool:
    return url == KNOWN


async def _run(chunks: list[str]) -> tuple[str, list[str]]:
    """All text the screen released, and the image urls, in order."""
    f = ImageMarkdownFilter(_allowed)
    pieces = [p for c in chunks for p in await f.feed(c)] + await f.flush()
    text = "".join(p for p in pieces if isinstance(p, str))
    return text, [p.url for p in pieces if isinstance(p, Image)]


async def test_plain_text_passes_through_immediately():
    f = ImageMarkdownFilter(_allowed)
    assert await f.feed("Xin chào") == ["Xin chào"]


async def test_known_image_leaves_the_text_even_when_split_across_chunks():
    assert await _run(["Đây ạ !", "[Áo](https://cdn/", "shirt.jpg) nhé"]) == ("Đây ạ nhé", [KNOWN])


async def test_unknown_image_is_dropped():
    assert await _run(["See ![x](https://evil/x.jpg) ok"]) == ("See ok", [])


async def test_a_lone_exclamation_is_released_at_flush():
    assert await _run(["Wow!"]) == ("Wow!", [])


async def test_removing_an_image_cannot_join_leftovers_into_a_new_one():
    assert await _run(["!![x](https://nope)[y](https://evil/p.png)"]) == ("", [])


async def test_the_join_is_caught_across_chunks_too():
    text, images = await _run(["!![x](https://nope)", "[y](https://evil/p.png) end"])
    assert images == []
    assert "![" not in text


async def test_released_text_never_ends_where_a_later_chunk_could_open_an_image():
    f = ImageMarkdownFilter(_allowed)
    released = await f.feed("Look !![x](https://nope)")
    assert "".join(p for p in released if isinstance(p, str)) == "Look"  # " !" is held
