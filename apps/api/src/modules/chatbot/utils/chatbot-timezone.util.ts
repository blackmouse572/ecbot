/**
 * The canonical spelling of an IANA zone ("asia/bangkok" -> "Asia/Bangkok").
 * apps/ai loads the stored value with Python's case-sensitive ZoneInfo, so
 * only this spelling works there. Anything Intl cannot resolve is returned
 * unchanged for @IsTimeZone to reject.
 */
export function canonicalTimezone(value: unknown): unknown {
    if (typeof value !== 'string' || !value) return value;
    try {
        return new Intl.DateTimeFormat('en-US', {
            timeZone: value,
        }).resolvedOptions().timeZone;
    } catch {
        return value;
    }
}
