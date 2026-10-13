"""Per-turn reply-language note.

A Vietnamese agent's prompt (Vietnamese knowledge, "em/anh chị" address style,
preferred language "vi") outweighs the system rule to answer in the customer's
language, so English customers got Vietnamese replies. When the newest message
is clearly not Vietnamese, a note in front of it restates the rule where the
model weighs it most. Unclear messages ("ok", an emoji) get no note, so the
conversation keeps its language.
"""

from __future__ import annotations

import re
import unicodedata

REPLY_LANGUAGE_NOTE = (
    "<reply_language>The customer is not writing in Vietnamese. Write your whole "
    "reply in the same language as their message: French if they wrote French, "
    "English if they wrote English, and so on. Your address style (em, anh, chị, "
    "bạn) is only for Vietnamese replies: here, use that language's plain forms, "
    "and no Vietnamese words such as ạ or nhé.</reply_language>"
)

# Letters only Vietnamese uses (đ, ă, ơ, ư, dot-below and hook-above vowels).
# Shared accents like é, à or ô also appear in French, so they do not count.
_VIETNAMESE_LETTERS = re.compile(
    "[ạảấầẩẫậắằẳẵặăẹẻẽếềểễệỉịĩọỏốồổỗộơớờởỡợụủũưứừửữựỳỵỷỹđ]", re.IGNORECASE
)
# Vietnamese words, compared without accents ("shop oi con hang ko"). Words
# that are also ordinary English or French (hang, bao, chi, ban, co) are left
# out: one of them would hide the note from an English customer.
_VIETNAMESE_WORDS = frozenset(
    {
        "khong",
        "ko",
        "hok",
        "kg",
        "dc",
        "duoc",
        "nha",
        "nhe",
        "nhen",
        "minh",
        "cho",
        "gia",
        "nhieu",
        "giao",
        "sao",
        "vay",
        "roi",
        "chua",
        "lam",
        "voi",
        "cua",
        "anh",
        "ak",
        "sp",
        "ib",
    }
)
# Letters outside the Latin script (Chinese, Japanese, Thai, Cyrillic, ...).
_NON_LATIN_LETTERS = re.compile(r"[^\W\d_A-Za-z\u00C0-\u024F\u1E00-\u1EFF]")
# apps/api appends English notes for the customer's photos after their text.
_IMAGE_NOTE = re.compile(
    r"^\[(?:Image description: |The user sent an image that could not be viewed)",
    re.MULTILINE,
)
_MIN_WORDS = 3


def reply_language_note(message: str) -> str:
    text = _IMAGE_NOTE.split(message, maxsplit=1)[0]
    if _VIETNAMESE_LETTERS.search(text):
        return ""
    if _NON_LATIN_LETTERS.search(text):
        return REPLY_LANGUAGE_NOTE
    plain = (
        unicodedata.normalize("NFD", text.lower()).encode("ascii", "ignore").decode()
    )
    words = re.findall(r"[a-z]+", plain)
    if len(words) < _MIN_WORDS or _VIETNAMESE_WORDS.intersection(words):
        return ""
    return REPLY_LANGUAGE_NOTE
