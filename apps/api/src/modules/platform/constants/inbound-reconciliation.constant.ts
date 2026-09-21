/**
 * How far back the reconciliation scheduler looks when polling platform APIs.
 * 25h puts us just past Messenger's ~24h webhook retry window — the last-resort
 * backstop (ADR-0002 + ADR-0007).
 */
export const RECONCILE_LOOKBACK_SECONDS = 25 * 60 * 60;
