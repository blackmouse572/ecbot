import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ChatbotCreateRequestDto } from '../../../../src/modules/chatbot/dtos/request/chatbot.create.request.dto';
import { ChatbotUpdateRequestDto } from '../../../../src/modules/chatbot/dtos/request/chatbot.update.request.dto';

function errorsFor(
    payload: Record<string, unknown>,
    dto: new () => object = ChatbotUpdateRequestDto
): string[] {
    return validateSync(plainToInstance(dto, payload), {
        skipUndefinedProperties: true,
    }).map(e => e.property);
}

// PUT /chatbots/:id merges: only the keys the body sends are written. A
// default on the DTO would put an unsent key back and overwrite the stored
// value (turning a configured guardrail off, for one).
describe('ChatbotUpdateRequestDto', () => {
    it('accepts a body with a single field', () => {
        expect(errorsFor({ guardrailEnabled: true })).toEqual([]);
        expect(errorsFor({ name: 'Only Name' })).toEqual([]);
    });

    it('adds no default for a key the body did not send', () => {
        const dto = plainToInstance(ChatbotUpdateRequestDto, {
            name: 'Only Name',
        });

        expect(Object.keys(dto)).toEqual(['name']);
    });

    // null clears an optional field, but a NOT NULL column cannot hold it:
    // reject with 422 instead of letting MikroORM throw a 500.
    it.each([
        'name',
        'type',
        'primaryLanguage',
        'modelTextName',
        'typingIndicator',
        'autoRead',
        'modelTemperature',
        'guardrailEnabled',
        'guardrailModelEnabled',
        'guardrailEscalateOnBlock',
        'handoffFallbackThreshold',
    ])('rejects null for %s, which cannot be cleared', field => {
        expect(errorsFor({ [field]: null })).toEqual([field]);
    });

    it.each([
        'avatar',
        'deferedLanguage',
        'welcomeMessage',
        'fallbackMessage',
        'maxTokens',
        'handoffMessage',
        'handoffKeywords',
        'guardrailCustomInstruction',
        'followupRules',
    ])('accepts null for %s, which clears it', field => {
        expect(errorsFor({ [field]: null })).toEqual([]);
    });
});

describe('ChatbotCreateRequestDto', () => {
    const base = {
        name: 'Lotus',
        type: 'beauty',
        primaryLanguage: 'en',
        modelTextName: 'google/gemini-2.5-flash',
    };

    it('leaves an unsent flag to the entity default', () => {
        expect(errorsFor({ ...base }, ChatbotCreateRequestDto)).toEqual([]);
    });

    it('rejects null for a flag the entity cannot store as null', () => {
        expect(
            errorsFor(
                { ...base, typingIndicator: null },
                ChatbotCreateRequestDto
            )
        ).toEqual(['typingIndicator']);
    });
});
