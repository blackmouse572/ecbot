import { plainToInstance } from 'class-transformer';
import { ChatbotGetDetailResponseDto } from '../../../../src/modules/chatbot/dtos/response/chatbot.detail.response.dto';
import { ChatbotListResponseDto } from '../../../../src/modules/chatbot/dtos/response/chatbot.list.response.dto';

/**
 * Responses are serialized with `excludeExtraneousValues`, so a field without
 * `@Expose()` is dropped silently. The caps were write-only for exactly that
 * reason: the create/update DTOs accepted them, but nothing ever read them
 * back, so the edit form could not show what was already set.
 */
describe('chatbot response DTOs expose the token budget caps', () => {
    const raw = {
        id: 'cb-1',
        name: 'Capped bot',
        dailyTokenCap: 100_000,
        monthlyTokenCap: 2_000_000,
    };

    it.each([
        ['list', ChatbotListResponseDto],
        ['detail', ChatbotGetDetailResponseDto],
    ])('%s keeps both caps through serialization', (_label, Dto) => {
        const dto = plainToInstance(Dto as never, raw, {
            excludeExtraneousValues: true,
        }) as { dailyTokenCap?: number; monthlyTokenCap?: number };

        expect(dto.dailyTokenCap).toBe(100_000);
        expect(dto.monthlyTokenCap).toBe(2_000_000);
    });

    it('leaves an uncapped chatbot undefined rather than zero', () => {
        const dto = plainToInstance(
            ChatbotListResponseDto,
            { id: 'cb-2', name: 'Uncapped' },
            { excludeExtraneousValues: true }
        );

        expect(dto.dailyTokenCap).toBeUndefined();
        expect(dto.monthlyTokenCap).toBeUndefined();
    });
});
