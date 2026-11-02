import {
    addTokenUsage,
    parseWireTokenUsage,
} from 'src/modules/chatbot/interfaces/token-usage-wire.interface';

describe('parseWireTokenUsage', () => {
    // Prompt-cache reads bill at a fraction of the input price, so the meter
    // needs them apart from the rest of the input.
    it('keeps the prompt cache reads and writes apps/ai reports', () => {
        expect(
            parseWireTokenUsage({
                input_tokens: 220,
                output_tokens: 12,
                total_tokens: 232,
                cache_read_tokens: 90,
                cache_write_tokens: 100,
            })
        ).toEqual({
            inputTokens: 220,
            outputTokens: 12,
            totalTokens: 232,
            cacheReadTokens: 90,
            cacheWriteTokens: 100,
        });
    });

    it('leaves the cache counts out when no cache was used', () => {
        expect(
            parseWireTokenUsage({
                input_tokens: 10,
                output_tokens: 4,
                total_tokens: 14,
                cache_read_tokens: 0,
                cache_write_tokens: 0,
            })
        ).toEqual({ inputTokens: 10, outputTokens: 4, totalTokens: 14 });
    });

    // More cached than sent is nonsense; billing it as cached would undercharge.
    it('drops cache counts that are negative or exceed the input', () => {
        expect(
            parseWireTokenUsage({
                input_tokens: 10,
                output_tokens: 4,
                total_tokens: 14,
                cache_read_tokens: 50,
                cache_write_tokens: -3,
            })
        ).toEqual({ inputTokens: 10, outputTokens: 4, totalTokens: 14 });
    });
});

describe('addTokenUsage', () => {
    // A Turn adds the reply frame and the image-description frame.
    it('adds the prompt cache counts of both sides', () => {
        expect(
            addTokenUsage(
                {
                    inputTokens: 100,
                    outputTokens: 5,
                    totalTokens: 105,
                    cacheWriteTokens: 90,
                },
                {
                    inputTokens: 120,
                    outputTokens: 7,
                    totalTokens: 127,
                    cacheReadTokens: 90,
                }
            )
        ).toEqual({
            inputTokens: 220,
            outputTokens: 12,
            totalTokens: 232,
            cacheReadTokens: 90,
            cacheWriteTokens: 90,
        });
    });

    it('adds no cache keys when neither side used the cache', () => {
        expect(
            addTokenUsage(
                { inputTokens: 10, outputTokens: 4, totalTokens: 14 },
                { inputTokens: 1, outputTokens: 2, totalTokens: 3 }
            )
        ).toEqual({ inputTokens: 11, outputTokens: 6, totalTokens: 17 });
    });
});
