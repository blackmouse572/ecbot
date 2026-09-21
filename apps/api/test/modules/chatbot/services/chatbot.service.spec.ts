import { ChatbotService } from '../../../../src/modules/chatbot/services/chatbot.service';
import { ChatbotCreateRequestDto } from '../../../../src/modules/chatbot/dtos/request/chatbot.create.request.dto';
import {
    ENUM_CHATBOT_LANGUAGE,
    ENUM_CHATBOT_TYPE,
} from '../../../../src/modules/chatbot/enums/chatbot.enum';

describe('ChatbotService', () => {
    let service: ChatbotService;

    beforeEach(() => {
        service = new ChatbotService({} as any, {} as any, {} as any);
    });

    describe('buildCreateEntity', () => {
        it('derives modelProvider from the OpenRouter id on create', () => {
            const dto = new ChatbotCreateRequestDto();
            dto.name = 'b';
            dto.type = ENUM_CHATBOT_TYPE.BEAUTY;
            dto.primaryLanguage = ENUM_CHATBOT_LANGUAGE.EN;
            dto.modelTextName = 'anthropic/claude-sonnet-4.5';
            dto.workspace = 'workspace-id-1';

            const entity = service.buildCreateEntity(dto);

            expect(entity.modelProvider).toBe('anthropic');
            expect(entity.modelTextName).toBe('anthropic/claude-sonnet-4.5');
        });

        it('does not leak accounts onto the entity fields', () => {
            const dto = new ChatbotCreateRequestDto();
            dto.name = 'b';
            dto.type = ENUM_CHATBOT_TYPE.BEAUTY;
            dto.primaryLanguage = ENUM_CHATBOT_LANGUAGE.EN;
            dto.modelTextName = 'openai/gpt-5.4';
            dto.workspace = 'workspace-id-1';
            dto.accounts = ['account-1'];

            const entity = service.buildCreateEntity(dto);

            expect(entity.modelProvider).toBe('openai');
            expect((entity as any).accounts).toBeUndefined();
        });
    });
});
