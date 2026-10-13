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

REPLY_LANGUAGE_NOTE = (
    "<reply_language>The customer is not writing in Vietnamese. Write your whole "
    "reply in the language of their message. Your address style (em, anh, chị, "
    "bạn) is only for Vietnamese replies: here, use plain I and you, and no "
    "Vietnamese words such as ạ or nhé.</reply_language>"
)

# Any Vietnamese vowel mark or đ: accented text is treated as Vietnamese.
_VIETNAMESE_LETTERS = re.compile(
    "[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]",
    re.IGNORECASE,
)
# Common words of Vietnamese typed without accents ("shop oi con hang ko").
_UNACCENTED_VIETNAMESE = frozenset(
    [
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
        "toi",
        "em",
        "anh",
        "chi",
        "di",
        "ak",
        "sp",
        "ib",
    ]
)
_MIN_WORDS = 3


def reply_language_note(message: str) -> str:
    if _VIETNAMESE_LETTERS.search(message):
        return ""
    words = re.findall(r"[a-z]+", message.lower())
    if len(words) < _MIN_WORDS or _UNACCENTED_VIETNAMESE.intersection(words):
        return ""
    return REPLY_LANGUAGE_NOTE
