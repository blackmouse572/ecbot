import { formatUnhandledError } from '../src/instrument';

describe('formatUnhandledError', () => {
    it('formats an Error as its stack', () => {
        const error = new Error('boom');

        expect(formatUnhandledError(error)).toBe(error.stack);
    });

    it('falls back to the message when an Error has no stack', () => {
        const error = new Error('boom');
        delete (error as { stack?: string }).stack;

        expect(formatUnhandledError(error)).toBe('boom');
    });

    it('bounds a large array instead of dumping every element', () => {
        const hugeArray = Array.from({ length: 5000 }, (_, i) => `item-${i}`);

        const output = formatUnhandledError(hugeArray);

        // util.inspect's maxArrayLength caps how many elements are rendered
        // and appends a "N more items" summary for the rest.
        expect(output.split('\n').length).toBeLessThan(20);
        expect(output).toContain('more item');
        expect(output).not.toContain('item-4999');
    });

    it('bounds a long string field instead of dumping it whole', () => {
        const payload = { token: 'x'.repeat(10_000) };

        const output = formatUnhandledError(payload);

        expect(output.length).toBeLessThan(1000);
    });

    it('does not throw on a circular object', () => {
        const circular: Record<string, unknown> = { name: 'job' };
        circular.self = circular;

        expect(() => formatUnhandledError(circular)).not.toThrow();
    });
});
