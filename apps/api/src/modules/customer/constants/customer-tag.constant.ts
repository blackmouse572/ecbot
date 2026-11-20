// Emoji (pictographs, variation selectors, zero-width joiners, skin tones)
// that a model may copy from the tag catalog into a tag name.
export const CUSTOMER_TAG_NAME_EMOJI =
    /[\p{Extended_Pictographic}\p{Emoji_Modifier}\u{FE0F}\u{200D}]/gu;
