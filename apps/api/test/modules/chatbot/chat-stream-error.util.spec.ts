// apps/api/test/modules/chatbot/chat-stream-error.util.spec.ts
import { safeErrorText } from '../../../src/modules/chatbot/utils/chat-stream-error.util';

describe('safeErrorText', () => {
    it('maps a 429 error to a safe busy message', () => {
        const out = safeErrorText(
            '[agent error: Error code: 429 - Too many requests]'
        );
        expect(out).toBe(
            'The AI service is busy. Please try again in a moment.'
        );
    });

    it('maps a 401 error to a safe auth message', () => {
        expect(
            safeErrorText('[agent error: Error code: 401 - unauthorized]')
        ).toBe(
            'AI service authentication failed. Please contact your workspace owner.'
        );
    });

    it('maps a 500 error to a safe unavailable message', () => {
        expect(safeErrorText('[agent error: Error code: 500 - boom]')).toBe(
            'The AI service is temporarily unavailable. Please try again later.'
        );
    });

    it('returns an empty string for a sensitive 402 credits error', () => {
        const raw =
            "[agent error: Error code: 402 - {'error': {'message': 'This request requires more credits', 'user_id': 'user_123'}}]";
        expect(safeErrorText(raw)).toBe('');
    });

    it('returns an empty string when no status code is present', () => {
        expect(safeErrorText('[agent error: something unexpected]')).toBe('');
        expect(safeErrorText('')).toBe('');
        expect(safeErrorText('[DONE]')).toBe('');
    });

    it('matches the "Error code NNN" variant without a colon', () => {
        expect(safeErrorText('[agent error: Error code 429]')).toBe(
            'The AI service is busy. Please try again in a moment.'
        );
    });
});
