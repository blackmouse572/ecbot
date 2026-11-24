/** What "AI soạn giúp" does with the current text. */
export enum ENUM_MARKETING_DRAFT_REWRITE {
    /** Viết kiểu khác: another wording, about as long. */
    DIFFERENT = 'DIFFERENT',
    /** Dài hơn. */
    LONGER = 'LONGER',
    /** Ngắn hơn. */
    SHORTER = 'SHORTER',
}

/** Giọng văn of a draft. */
export enum ENUM_MARKETING_DRAFT_TONE {
    /** Thân thiện (the default). */
    FRIENDLY = 'FRIENDLY',
    /** Lịch sự. */
    POLITE = 'POLITE',
    /** Vui vẻ. */
    PLAYFUL = 'PLAYFUL',
}
