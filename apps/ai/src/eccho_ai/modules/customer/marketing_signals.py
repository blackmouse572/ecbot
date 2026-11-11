"""Marketing signals from the customer classifier (#500).

The model reports what the customer said that moves their marketing labels;
this module keeps only the signals apps/api can act on.
"""

import unicodedata

from eccho_ai.modules.customer.models import (
    ClassifyRequest,
    MarketingSignal,
    MarketingSignalResult,
)

DEFER_DAYS = 60
DEFER_DAYS_LONG = 90
MAX_QUOTE_LEN = 200

PROMPT_SECTION = """\
Marketing signals:
6. Fill `marketing_signals` with what the CUSTOMER ([user] lines) said that
   matters for the shop's marketing. Each item has:
   - `kind`: one of
     "interest": asks about the shop or a product, or shows interest in it
       ("serum này dùng sao", "có màu đỏ không", "do you ship to Hanoi").
     "asked_price": asks the price, the shipping fee, or how to order
       ("giá bao nhiêu", "ship bao nhiêu", "đặt sao", "how much").
       Use this instead of "interest" for the same product in the same message.
     "later": postpones a product ("serum để sau nha", "khi khác mình mua",
       "chưa cần", "maybe later"). Only for a product group from the list.
       Not when the customer refuses all offers.
     "complaint": unhappy, angry or harsh about the order, the service or
       the shop, without insulting anyone ("tức quá", "shop làm ăn kiểu gì
       vậy", "worst shop ever", "I want a refund").
     "hostile": insults or threatens people: swear words, calling the staff
       or the shop names ("đồ ngu", "lừa đảo", "idiots", "scammers"), or
       threats. It stops all offers for good, so anything less is
       "complaint".
   - `product_group`: the exact name from the product groups list that the
     message is about, or "" when none fits. Never invent a name.
   - `defer_days`: "later" only. 60, or 90 when the customer says a longer
     time ("vài tháng nữa", "sang năm", "after Tet", "in a few months").
     Leave it empty for the other kinds.
   - `message_index`: the #number of the customer message.
   - `quote`: the customer's words from that message, up to 200 characters.
   One item per kind and product group per message. Never use [bot],
   [operator] or [system] lines. When nothing fits, return an empty list.
"""


def check_signals(
    req: ClassifyRequest, signals: list[MarketingSignal]
) -> list[MarketingSignalResult]:
    """Drops signals apps/api cannot trust and fills in what it needs."""
    groups = {_key(g.name): g for g in req.product_groups}
    kept: list[MarketingSignalResult] = []
    seen: set[tuple[str, str, int]] = set()
    for signal in signals:
        index = signal.message_index
        if not 0 <= index < len(req.recent_messages):
            continue
        message = req.recent_messages[index]
        if message.role != "user":
            continue

        # A complaint only gives the model somewhere to put anger that is
        # not hostile; it changes no label.
        if signal.kind == "complaint":
            continue
        group = groups.get(_key(signal.product_group))
        if signal.kind == "hostile":
            group = None
        if signal.kind == "later" and group is None:
            continue

        key = (signal.kind, group.id if group else "", index)
        if key in seen:
            continue
        seen.add(key)

        quote = signal.quote.strip() or message.text.strip()
        kept.append(
            MarketingSignalResult(
                kind=signal.kind,
                product_group=group.name if group else "",
                product_group_id=group.id if group else None,
                defer_days=_defer_days(signal) if signal.kind == "later" else None,
                message_index=index,
                quote=quote[:MAX_QUOTE_LEN],
            )
        )
    return kept


def format_product_groups(req: ClassifyRequest) -> str:
    if not req.product_groups:
        return "(none)"
    return "\n".join(f"- {g.name}" for g in req.product_groups)


def _defer_days(signal: MarketingSignal) -> int:
    if signal.defer_days and signal.defer_days >= DEFER_DAYS_LONG:
        return DEFER_DAYS_LONG
    return DEFER_DAYS


def _key(name: str) -> str:
    # Vietnamese names may come back decomposed (NFD) or in another case.
    return unicodedata.normalize("NFC", name).strip().casefold()
