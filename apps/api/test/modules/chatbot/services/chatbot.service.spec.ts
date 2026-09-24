import { BadRequestException } from '@nestjs/common';
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

    // Regression: linking a chatbot to another workspace's accounts (via
    // create/update/linkBatchAccounts) must be rejected, not silently allowed.
    describe('cross-workspace account linking', () => {
        let em: { find: jest.Mock; getReference: jest.Mock };
        let chatbotRepository: {
            create: jest.Mock;
            save: jest.Mock;
        };
        let crossWorkspaceService: ChatbotService;

        beforeEach(() => {
            em = {
                find: jest.fn(),
                getReference: jest.fn((_entity, id) => ({ id })),
            };
            chatbotRepository = {
                create: jest.fn(),
                save: jest.fn(async entity => entity),
            };
            crossWorkspaceService = new ChatbotService(
                em as any,
                chatbotRepository as any,
                { invalidate: jest.fn() } as any
            );
        });

        function makeCreateDto(accounts: string[]): ChatbotCreateRequestDto {
            const dto = new ChatbotCreateRequestDto();
            dto.name = 'b';
            dto.type = ENUM_CHATBOT_TYPE.BEAUTY;
            dto.primaryLanguage = ENUM_CHATBOT_LANGUAGE.EN;
            dto.modelTextName = 'anthropic/claude-sonnet-4.5';
            dto.workspace = 'workspace-1';
            dto.accounts = accounts;
            return dto;
        }

        describe('create', () => {
            it('throws BadRequestException when an account id belongs to another workspace', async () => {
                em.find.mockResolvedValue([{ id: 'account-1' }]);

                await expect(
                    crossWorkspaceService.create(
                        makeCreateDto(['account-1', 'account-2'])
                    )
                ).rejects.toThrow(BadRequestException);
                expect(chatbotRepository.create).not.toHaveBeenCalled();
            });

            it('creates the chatbot when every account belongs to the workspace', async () => {
                em.find.mockResolvedValue([
                    { id: 'account-1' },
                    { id: 'account-2' },
                ]);
                const created = { accounts: { add: jest.fn() } };
                chatbotRepository.create.mockResolvedValue(created);

                const result = await crossWorkspaceService.create(
                    makeCreateDto(['account-1', 'account-2'])
                );

                expect(result).toBe(created);
                expect(created.accounts.add).toHaveBeenCalledTimes(2);
            });
        });

        describe('update', () => {
            it('throws BadRequestException when updating accounts with a cross-workspace id', async () => {
                em.find.mockResolvedValue([]);
                const repository: any = {
                    workspace: { id: 'workspace-1' },
                    accounts: undefined,
                };

                await expect(
                    crossWorkspaceService.update(repository, {
                        accounts: ['account-x'],
                    } as any)
                ).rejects.toThrow(BadRequestException);
                expect(chatbotRepository.save).not.toHaveBeenCalled();
            });
        });

        describe('linkBatchAccounts', () => {
            it('throws BadRequestException when linking an account from another workspace', async () => {
                em.find.mockResolvedValue([]);
                const chatbot: any = {
                    workspace: { id: 'workspace-1' },
                    accounts: {
                        isInitialized: () => true,
                        getItems: () => [],
                        add: jest.fn(),
                    },
                };

                await expect(
                    crossWorkspaceService.linkBatchAccounts(chatbot, [
                        'account-x',
                    ])
                ).rejects.toThrow(BadRequestException);
                expect(chatbot.accounts.add).not.toHaveBeenCalled();
            });
        });
    });
});
