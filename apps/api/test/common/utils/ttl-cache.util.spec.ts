import { TtlCache } from '../../../src/common/utils/ttl-cache.util';

describe('TtlCache', () => {
    let now = 0;
    const clock = () => now;

    beforeEach(() => {
        now = 1_000;
    });

    it('returns a value until its ttl runs out', () => {
        const cache = new TtlCache<string>(30_000, 10, clock);
        cache.set('a', 'one');

        now += 29_999;
        expect(cache.get('a')).toBe('one');

        now += 1;
        expect(cache.get('a')).toBeUndefined();
    });

    it('evicts the oldest entry once full', () => {
        const cache = new TtlCache<number>(30_000, 2, clock);
        cache.set('a', 1);
        cache.set('b', 2);
        cache.set('c', 3);

        expect(cache.get('a')).toBeUndefined();
        expect(cache.get('b')).toBe(2);
        expect(cache.get('c')).toBe(3);
    });
});
