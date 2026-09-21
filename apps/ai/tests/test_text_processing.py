import os

os.environ.setdefault("POSTGRES_URL", "postgresql://u:p@localhost/x")

import pytest

from eccho_ai.llm.retrievers.text_processing import assert_supported_file, load_document


def test_loads_markdown_as_plain_text(tmp_path):
    path = tmp_path / "notes.md"
    path.write_text("# Title\n\nSome **markdown** body text.", encoding="utf-8")

    document = load_document(path, source_filename="notes.md", mime_type="text/markdown")

    assert "Title" in document.page_content
    assert "markdown" in document.page_content


def test_loads_html_and_strips_tags(tmp_path):
    path = tmp_path / "page.html"
    path.write_text(
        "<html><head><style>body{color:red}</style></head>"
        "<body><h1>Heading</h1><p>Readable paragraph.</p>"
        "<script>evil()</script></body></html>",
        encoding="utf-8",
    )

    document = load_document(path, source_filename="page.html", mime_type="text/html")

    assert "Heading" in document.page_content
    assert "Readable paragraph." in document.page_content
    assert "evil()" not in document.page_content
    assert "color:red" not in document.page_content


def test_loads_htm_alias_same_as_html(tmp_path):
    path = tmp_path / "page.htm"
    path.write_text("<html><body><h1>Htm Heading</h1></body></html>", encoding="utf-8")

    document = load_document(path, source_filename="page.htm", mime_type="text/html")

    assert "Htm Heading" in document.page_content


def test_rejects_unsupported_extension(tmp_path):
    path = tmp_path / "data.xyz"
    path.write_text("whatever", encoding="utf-8")

    with pytest.raises(ValueError):
        assert_supported_file(path)


def test_html_without_body_tag_still_extracts_text(tmp_path):
    path = tmp_path / "fragment.html"
    path.write_text("<p>Just a fragment, no html/body wrapper.</p>", encoding="utf-8")

    document = load_document(path, source_filename="fragment.html", mime_type="text/html")

    assert "Just a fragment" in document.page_content


def test_corrupt_docx_raises_value_error_not_crash(tmp_path):
    path = tmp_path / "fake.docx"
    path.write_bytes(b"not actually a zip file")

    with pytest.raises(ValueError):
        load_document(
            path,
            source_filename="fake.docx",
            mime_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )
