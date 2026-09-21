// apps/api/test/modules/chatbot/dtos/chatbot-budget-cap.dto.spec.ts
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ChatbotCreateRequestDto } from '../../../../src/modules/chatbot/dtos/request/chatbot.create.request.dto';
import { ChatbotUpdateRequestDto } from '../../../../src/modules/chatbot/dtos/request/chatbot.update.request.dto';
import { ChatbotListResponseDto } from '../../../../src/modules/chatbot/dtos/response/chatbot.list.response.dto';

function errorsFor<T extends object>(
    cls: new () => T,
    payload: Record<string, unknown>
): string[] {
    return validateSync(plainToInstance(cls, payload), {
        skipUndefinedProperties: true,
    }).map(e => e.property);
}

// TokenGuardService enforces these caps, but the columns were unreachable: the
// entity had them and nothing could write them, so they were always null and
// the cap branch never ran. These tests pin the write path open.
describe('chatbot budget caps', () => {
    it('accepts both caps on create', () => {
        expect(
            errorsFor(ChatbotCreateRequestDto, {
                dailyTokenCap: 100_000,
                monthlyTokenCap: 2_000_000,
            })
        ).toEqual([]);
    });

    it('accepts both caps on update', () => {
        expect(
            errorsFor(ChatbotUpdateRequestDto, {
                dailyTokenCap: 50_000,
                monthlyTokenCap: 900_000,
            })
        ).toEqual([]);
    });

    // Omitting a cap is how "uncapped" is expressed — the guard skips the usage
    // SUM entirely when it is absent.
    it('treats an omitted cap as valid', () => {
        expect(errorsFor(ChatbotCreateRequestDto, {})).toEqual([]);
    });

    it('rejects a zero or negative cap', () => {
        expect(
            errorsFor(ChatbotCreateRequestDto, { dailyTokenCap: 0 })
        ).toContain('dailyTokenCap');
        expect(
            errorsFor(ChatbotCreateRequestDto, { monthlyTokenCap: -1 })
        ).toContain('monthlyTokenCap');
    });

    // A fractional token budget is meaningless and would round unpredictably
    // against the SUM it is compared with.
    it('rejects a fractional cap', () => {
        expect(
            errorsFor(ChatbotCreateRequestDto, { dailyTokenCap: 1.5 })
        ).toContain('dailyTokenCap');
    });
});

describe('chatbot budget caps — read path', () => {
    // ChatbotService maps responses with `excludeExtraneousValues: true`, so a
    // field without @Expose() never leaves the API. The edit form seeds itself
    // from the response, so an unexposed cap renders empty and a resave clears
    // it. Detail/create/admin DTOs all derive from this one.
    it('exposes both caps on the response DTO', () => {
        const dto = plainToInstance(
            ChatbotListResponseDto,
            { dailyTokenCap: 100_000, monthlyTokenCap: 2_000_000 },
            { excludeExtraneousValues: true }
        );

        expect(dto.dailyTokenCap).toBe(100_000);
        expect(dto.monthlyTokenCap).toBe(2_000_000);
    });
});
