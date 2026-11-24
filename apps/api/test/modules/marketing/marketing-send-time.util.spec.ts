import {
    marketingSendAt,
    marketingSendEnd,
} from 'src/modules/marketing/utils/marketing-send-time.util';

const ZONE = 'Asia/Ho_Chi_Minh'; // UTC+7
const at = (iso: string) => new Date(iso);

describe('marketingSendAt', () => {
    it('sends at once inside the send hours', () => {
        // 10:30 shop time.
        const now = at('2026-11-22T03:30:00.000Z');
        expect(marketingSendAt(now, ZONE, '09:00', '20:00')).toEqual(now);
    });

    it('waits for the opening before the send hours', () => {
        // 06:00 shop time → 09:00 the same day.
        expect(
            marketingSendAt(
                at('2026-11-21T23:00:00.000Z'),
                ZONE,
                '09:00',
                '20:00'
            )
        ).toEqual(at('2026-11-22T02:00:00.000Z'));
    });

    it('moves to the next morning from the closing time on', () => {
        // 20:00 and 23:30 shop time → 09:00 the next day.
        for (const now of [
            '2026-11-22T13:00:00.000Z',
            '2026-11-22T16:30:00.000Z',
        ]) {
            expect(marketingSendAt(at(now), ZONE, '09:00', '20:00')).toEqual(
                at('2026-11-23T02:00:00.000Z')
            );
        }
    });

    it("follows the shop's own hours", () => {
        // 08:15 shop time, sending from 08:00 to 08:30.
        const now = at('2026-11-22T01:15:00.000Z');
        expect(marketingSendAt(now, ZONE, '08:00', '08:30')).toEqual(now);
    });
});

describe('marketingSendEnd', () => {
    it("gives the closing time on the send's own shop day", () => {
        // 08:30 shop time on 23 Nov (01:30 UTC) closes at 20:00 that day.
        expect(
            marketingSendEnd(at('2026-11-23T01:30:00.000Z'), ZONE, '20:00')
        ).toEqual(at('2026-11-23T13:00:00.000Z'));
    });
});
