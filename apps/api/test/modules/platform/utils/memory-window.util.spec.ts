import { memoryWindowDrop } from '@app/modules/platform/utils/memory-window.util';

describe('memoryWindowDrop', () => {
    it('keeps every message up to the max', () => {
        expect(memoryWindowDrop(0)).toBe(0);
        expect(memoryWindowDrop(40)).toBe(0);
    });

    it('drops whole steps past the max, keeping 20 to 40 messages', () => {
        expect(memoryWindowDrop(41)).toBe(20);
        expect(memoryWindowDrop(59)).toBe(20);
        expect(memoryWindowDrop(60)).toBe(40);
        expect(memoryWindowDrop(500)).toBe(480);
    });

    it('moves the first kept message only once per step', () => {
        const starts = new Set(
            Array.from({ length: 19 }, (_, i) => memoryWindowDrop(41 + i))
        );
        expect(starts.size).toBe(1);
    });
});
