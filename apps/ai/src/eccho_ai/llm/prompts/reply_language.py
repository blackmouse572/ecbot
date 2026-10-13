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
# Common Vietnamese words, compared without accents ("shop oi con hang ko").
_VIETNAMESE_WORDS = frozenset(
    {
        "khong",
        "ko",
        "k",
        "hok",
        "hong",
        "kg",
        "dc",
        "duoc",
        "oi",
        "nha",
        "nhe",
        "nhen",
        "minh",
        "ban",
        "cho",
        "gia",
        "bao",
        "nhieu",
        "con",
        "hang",
        "giao",
        "sao",
        "vay",
        "roi",
        "chua",
        "lam",
        "voi",
        "cua",
        "em",
        "anh",
        "chi",
        "di",
        "ak",
        "sp",
        "ib",
        "co",
    }
)
_MIN_WORDS = 3


def reply_language_note(message: str) -> str:
    if _VIETNAMESE_LETTERS.search(message):
        return ""
    plain = (
        unicodedata.normalize("NFD", message.lower()).encode("ascii", "ignore").decode()
    )
    words = re.findall(r"[a-z]+", plain)
    if len(words) < _MIN_WORDS or _VIETNAMESE_WORDS.intersection(words):
        return ""
    return REPLY_LANGUAGE_NOTE
