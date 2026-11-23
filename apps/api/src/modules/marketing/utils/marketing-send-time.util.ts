import { DateTime } from 'luxon';

const at = (day: DateTime, hhmm: string): DateTime => {
    const [hour, minute] = hhmm.split(':').map(Number);
    return day.set({ hour, minute, second: 0, millisecond: 0 });
};

/**
 * When an offer may go out: now inside the shop's send hours, else the next
 * opening ("HH:mm" in `zone`, `to` exclusive).
 */
export function marketingSendAt(
    now: Date,
    zone: string | undefined,
    from: string,
    to: string
): Date {
    const local = DateTime.fromJSDate(now, { zone });
    const start = at(local, from);
    if (local < start) return start.toJSDate();
    if (local < at(local, to)) return now;
    return at(local.plus({ days: 1 }), from).toJSDate();
}
