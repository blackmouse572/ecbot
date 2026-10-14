import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { REQUEST_VALIDATION_PIPE_OPTIONS } from '../../../../src/common/request/constants/request.constant';
import { ConversationUpdateTimezoneRequestDto } from '../../../../src/modules/conversation/dtos/request/conversation.update-timezone.request.dto';

function errorsFor(payload: Record<string, unknown>): string[] {
    // Same options as the app's ValidationPipe, so skipUndefinedProperties applies.
    return validateSync(
        plainToInstance(ConversationUpdateTimezoneRequestDto, payload),
        REQUEST_VALIDATION_PIPE_OPTIONS
    ).map(e => e.property);
}

describe('ConversationUpdateTimezoneRequestDto', () => {
    it('accepts an IANA timezone', () => {
        expect(errorsFor({ timezone: 'America/New_York' })).toEqual([]);
    });

    it('accepts null, which returns the conversation to the agent timezone', () => {
        expect(errorsFor({ timezone: null })).toEqual([]);
    });

    it('rejects a missing key, so an empty body cannot clear it by accident', () => {
        expect(errorsFor({})).toEqual(['timezone']);
    });

    it('rejects anything apps/ai cannot load', () => {
        expect(errorsFor({ timezone: 'Mars/Olympus' })).toEqual(['timezone']);
        expect(errorsFor({ timezone: '' })).toEqual(['timezone']);
        expect(errorsFor({ timezone: '+07:00' })).toEqual(['timezone']);
    });

    it('stores the canonical spelling', () => {
        const dto = plainToInstance(ConversationUpdateTimezoneRequestDto, {
            timezone: 'america/new_york',
        });
        expect(dto.timezone).toBe('America/New_York');
    });
});
