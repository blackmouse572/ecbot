import {
    ANALYTICS_RANGE_DAYS,
    ENUM_ANALYTICS_RANGE,
} from '../constants/analytics.constant';

const DAY_MS = 86_400_000;

const shift = (day: string, days: number): string =>
    new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS)
        .toISOString()
        .slice(0, 10);

/**
 * The period ending today in `timezone`, the same number of days before it,
 * and every day of the period in order (so empty days can be filled).
 */
export function analyticsWindows(
    range: ENUM_ANALYTICS_RANGE,
    timezone: string,
    now: Date
): {
    current: { from: string; to: string };
    previous: { from: string; to: string };
    days: string[];
} {
    const n = ANALYTICS_RANGE_DAYS[range];
    // en-CA formats a date as YYYY-MM-DD.
    const today = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
    }).format(now);
    const to = shift(today, 1);
    const from = shift(to, -n);
    return {
        current: { from, to },
        previous: { from: shift(from, -n), to: from },
        days: Array.from({ length: n }, (_, i) => shift(from, i)),
    };
}
