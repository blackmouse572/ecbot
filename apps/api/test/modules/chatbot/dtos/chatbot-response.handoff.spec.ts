import { plainToInstance } from 'class-transformer';
import { ChatbotGetDetailResponseDto } from '../../../../src/modules/chatbot/dtos/response/chatbot.detail.response.dto';
import { ChatbotListResponseDto } from '../../../../src/modules/chatbot/dtos/response/chatbot.list.response.dto';

// Serialized with `excludeExtraneousValues`, so a field without `@Expose()`
// is dropped. The edit form seeds from the detail response, so a dropped
// handoffMessage came back empty and saving the form cleared it.
describe('chatbot response DTOs expose handoffMessage', () => {
    it.each([
        ['list', ChatbotListResponseDto],
        ['detail', ChatbotGetDetailResponseDto],
    ])('%s keeps handoffMessage through serialization', (_label, Dto) => {
        const dto = plainToInstance(
            Dto as never,
            { id: 'cb-1', handoffMessage: 'A person will reply soon' },
            { excludeExtraneousValues: true }
        ) as { handoffMessage?: string };

        expect(dto.handoffMessage).toBe('A person will reply soon');
    });
});
