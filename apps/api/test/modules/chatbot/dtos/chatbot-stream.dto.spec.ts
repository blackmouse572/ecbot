// apps/api/test/modules/chatbot/dtos/chatbot-stream.dto.spec.ts
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ChatbotPreviewStreamRequestDto } from '../../../../src/modules/chatbot/dtos/request/chatbot.preview-stream.request.dto';
import { ChatbotStreamRequestDto } from '../../../../src/modules/chatbot/dtos/request/chatbot.stream.request.dto';

function errorsFor<T extends object>(
    cls: new () => T,
    payload: Record<string, unknown>
): string[] {
    return validateSync(plainToInstance(cls, payload), {
        skipUndefinedProperties: true,
    }).map(e => e.property);
}

// The AI SDK's `useChat` mints its own conversation id — a 16-char nanoid, not
// a UUID. Constraining this to a UUID broke every real chat turn with a 422.
const AI_SDK_SESSION_ID = 'ETDBmNUSBlXcVcLz';

describe('ChatbotStreamRequestDto', () => {
    it('accepts the session id shape the AI SDK actually sends', () => {
        expect(
            errorsFor(ChatbotStreamRequestDto, {
                message: 'hello',
                chat_session_id: AI_SDK_SESSION_ID,
            })
        ).toEqual([]);
    });

    it('still accepts a UUID session id', () => {
        expect(
            errorsFor(ChatbotStreamRequestDto, {
                message: 'hello',
                chat_session_id: '550e8400-e29b-41d4-a716-446655440000',
            })
        ).toEqual([]);
    });

    it('works without a session id at all', () => {
        expect(
            errorsFor(ChatbotStreamRequestDto, { message: 'hello' })
        ).toEqual([]);
    });

    // The id is hashed before it becomes a Redis key, so the constraint exists
    // to bound the input, not to protect the key space.
    it.each([
        ['too long', 'x'.repeat(65)],
        ['path separators', 'a/../b'],
        ['a newline', 'abc\ndef'],
        ['a colon', 'chatbot-preview:sess'],
        ['empty', ''],
    ])('rejects a session id with %s', (_label, value) => {
        expect(
            errorsFor(ChatbotStreamRequestDto, {
                message: 'hello',
                chat_session_id: value,
            })
        ).toEqual(['chat_session_id']);
    });

    it('rejects a message over the length cap', () => {
        expect(
            errorsFor(ChatbotStreamRequestDto, { message: 'x'.repeat(2001) })
        ).toEqual(['message']);
    });

    it('rejects a missing message', () => {
        expect(errorsFor(ChatbotStreamRequestDto, {})).toEqual(['message']);
    });
});

describe('ChatbotPreviewStreamRequestDto', () => {
    it('accepts the session id shape the AI SDK actually sends', () => {
        expect(
            errorsFor(ChatbotPreviewStreamRequestDto, {
                token: 'tok',
                message: 'hello',
                chat_session_id: AI_SDK_SESSION_ID,
            })
        ).toEqual([]);
    });

    it('rejects a missing token', () => {
        expect(
            errorsFor(ChatbotPreviewStreamRequestDto, { message: 'hello' })
        ).toEqual(['token']);
    });
});
