/** Tổng quan compares this week with the one before ("so với tuần trước"). */
export const MARKETING_OVERVIEW_WEEK_DAYS = 7;

/** List health (opt-outs) covers this many days, against the period before. */
export const MARKETING_OVERVIEW_HEALTH_DAYS = 30;

/** At most this many stage moves are listed, the largest first. */
export const MARKETING_OVERVIEW_MAX_MOVES = 5;

/** Quan tâm row: still interested if they wrote within this many days. */
export const MARKETING_TODO_INTERESTED_ACTIVE_DAYS = 30;

/** Đã mua 1 lần row: suggest a second item this many days after the order. */
export const MARKETING_TODO_CROSS_SELL_FROM_DAYS = 15;
export const MARKETING_TODO_CROSS_SELL_TO_DAYS = 30;

/** Mua lại row: due once this share of the product group's cycle has passed. */
export const MARKETING_TODO_REPURCHASE_DUE_SHARE = 0.8;
/** ...and still worth a reminder until this many days past the cycle. */
export const MARKETING_TODO_REPURCHASE_LATE_DAYS = 30;

/** Lâu không nhắn row: bought, then silent for this window of days. */
export const MARKETING_TODO_WIN_BACK_FROM_DAYS = 31;
export const MARKETING_TODO_WIN_BACK_TO_DAYS = 90;
