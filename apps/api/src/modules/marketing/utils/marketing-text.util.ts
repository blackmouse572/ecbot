import {
    MARKETING_TEXT_FALLBACK,
    MARKETING_TEXT_NAME,
    MARKETING_TEXT_PRODUCT,
} from '../constants/marketing-send.constant';

/**
 * An offer's text for one customer: {name} and {product} filled in, or the
 * chatbot language's fallback when the customer has none.
 */
export function marketingText(
    text: string,
    values: { name?: string | null; product?: string | null },
    language: string
): string {
    const fallback =
        MARKETING_TEXT_FALLBACK[language] ?? MARKETING_TEXT_FALLBACK.vi;
    return text
        .replaceAll(MARKETING_TEXT_NAME, values.name?.trim() || fallback.name)
        .replaceAll(
            MARKETING_TEXT_PRODUCT,
            values.product?.trim() || fallback.product
        );
}
