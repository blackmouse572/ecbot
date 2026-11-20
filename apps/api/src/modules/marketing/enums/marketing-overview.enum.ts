/** The six "Việc nên làm" rows on Tổng quan, one per stage. */
export enum ENUM_MARKETING_TODO {
    /** Mới biết: customers who first wrote this week. */
    NEW = 'NEW',
    /** Quan tâm: looked at products, did not ask the price, still writing. */
    INTERESTED = 'INTERESTED',
    /** Hỏi giá: asked the price this week and did not buy. */
    ASKED_PRICE = 'ASKED_PRICE',
    /** Đã mua 1 lần: bought once, 15 to 30 days ago. */
    CROSS_SELL = 'CROSS_SELL',
    /** Mua lại: close to the end of the product group's repurchase cycle. */
    REPURCHASE = 'REPURCHASE',
    /** Lâu không nhắn: bought, then 31 to 90 days without coming back. */
    WIN_BACK = 'WIN_BACK',
}
