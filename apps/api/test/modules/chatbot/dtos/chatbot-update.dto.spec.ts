import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ChatbotUpdateRequestDto } from '../../../../src/modules/chatbot/dtos/request/chatbot.update.request.dto';

function errorsFor(payload: Record<string, unknown>): string[] {
    return validateSync(plainToInstance(ChatbotUpdateRequestDto, payload), {
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
});
