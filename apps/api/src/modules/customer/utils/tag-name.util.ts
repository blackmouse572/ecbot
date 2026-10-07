/**
 * Tag names compared in one Unicode form: Vietnamese diacritics can arrive
 * precomposed (NFC) or decomposed (NFD), e.g. from the classifier model.
 */
export const normalizeTagName = (name: string): string => name.normalize('NFC');
