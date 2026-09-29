from eccho_ai.modules.chat.citation_markers import (
    CitationMarkerFilter,
    strip_citation_markers,
)


def _stream(chunks: list[str]) -> str:
    f = CitationMarkerFilter()
    return "".join(f.feed(c) for c in chunks) + f.flush()


def test_strip_removes_single_and_grouped_markers():
    text = "Friso Gold is 450k [KB-1]. Returns within 7 days [KB-2, KB-3]."
    assert strip_citation_markers(text) == "Friso Gold is 450k. Returns within 7 days."


def test_strip_keeps_other_brackets():
    assert strip_citation_markers("Size [M] and [KB] stay") == "Size [M] and [KB] stay"


def test_stream_removes_marker_split_across_chunks():
    assert _stream(["Price is 450k [K", "B-", "12]", " today."]) == "Price is 450k today."


def test_stream_releases_non_marker_bracket():
    assert _stream(["Pick [", "M] please"]) == "Pick [M] please"


def test_stream_flushes_unfinished_tail():
    assert _stream(["Ends with [KB"]) == "Ends with [KB"


def test_marker_at_line_start_leaves_no_leading_space():
    assert strip_citation_markers("[KB-1] Next\n[KB-2] Then") == "Next\nThen"


def test_stream_marker_at_reply_start_leaves_no_leading_space():
    assert _stream(["[KB", "-1] Next line"]) == "Next line"
    assert _stream(["Intro.\n", "[KB-1] Next"]) == "Intro.\nNext"
