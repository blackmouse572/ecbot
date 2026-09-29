import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { ChatbotEntity } from '../../../../src/modules/chatbot/repository/entities/chatbot.entity';
import { ChatbotService } from '../../../../src/modules/chatbot/services/chatbot.service';
import { ChatbotCreateRequestDto } from '../../../../src/modules/chatbot/dtos/request/chatbot.create.request.dto';
import {
    ENUM_CHATBOT_LANGUAGE,
    ENUM_CHATBOT_TYPE,
} from '../../../../src/modules/chatbot/enums/chatbot.enum';

describe('ChatbotService', () => {
    let service: ChatbotService;

    beforeEach(() => {
        service = new ChatbotService(
            {} as any,
            {} as any,
            {} as any,
            {} as any
        );
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

        it('leaves unsent flags to the entity defaults', () => {
            const dto = plainToInstance(ChatbotCreateRequestDto, {
                name: 'b',
                type: ENUM_CHATBOT_TYPE.BEAUTY,
                primaryLanguage: ENUM_CHATBOT_LANGUAGE.EN,
                modelTextName: 'openai/gpt-5.4',
                workspace: 'workspace-id-1',
            });

            const entity = plainToInstance(
                ChatbotEntity,
                service.buildCreateEntity(dto)
            );

            expect(entity).toMatchObject({
                typingIndicator: true,
                autoRead: true,
                modelTemperature: 1.0,
                guardrailEnabled: false,
                guardrailModelEnabled: false,
                guardrailEscalateOnBlock: true,
            });
        });
    });

    // Regression: linking a chatbot to another workspace's accounts (via
    // create/update/linkBatchAccounts) must be rejected, not silently allowed.
    // create/update replace the whole account list, so they have no way to
    // report a skipped id: an account owned by another live chatbot fails
    // the call instead of being silently moved (linkBatchAccounts skips it).
    describe('accounts owned by another chatbot', () => {
        let accountRepository: { find: jest.Mock };
        let chatbotRepository: { create: jest.Mock; save: jest.Mock };
        let ownershipService: ChatbotService;

        beforeEach(() => {
            accountRepository = { find: jest.fn(async () => []) };
            chatbotRepository = {
                create: jest.fn(async entity => ({
                    ...entity,
                    accounts: { add: jest.fn() },
                })),
                save: jest.fn(async entity => entity),
            };
            ownershipService = new ChatbotService(
                {
                    find: jest.fn(
                        async (_entity, where: { id: { $in: string[] } }) =>
                            where.id.$in.map(id => ({ id }))
                    ),
                    getReference: jest.fn((_entity, id) => ({ id })),
                } as any,
                chatbotRepository as any,
                { invalidate: jest.fn() } as any,
                accountRepository as any
            );
        });

        const taken = {
            id: 'account-1',
            chatbot: { id: 'other-bot', deletedAt: undefined },
        };

        function makeDto(accounts: string[]): ChatbotCreateRequestDto {
            const dto = new ChatbotCreateRequestDto();
            dto.name = 'b';
            dto.type = ENUM_CHATBOT_TYPE.BEAUTY;
            dto.primaryLanguage = ENUM_CHATBOT_LANGUAGE.EN;
            dto.modelTextName = 'anthropic/claude-sonnet-4.5';
            dto.workspace = 'workspace-1';
            dto.accounts = accounts;
            return dto;
        }

        it('create refuses an account another chatbot owns', async () => {
            accountRepository.find.mockResolvedValue([taken]);

            await expect(
                ownershipService.create(makeDto(['account-1']))
            ).rejects.toMatchObject({
                response: { message: 'chatbot.error.accountsTaken' },
            });
            expect(chatbotRepository.create).not.toHaveBeenCalled();
        });

        it('update refuses an account another chatbot owns', async () => {
            accountRepository.find.mockResolvedValue([taken]);
            const repository: any = {
                id: 'bot-1',
                workspace: { id: 'workspace-1' },
                accounts: undefined,
            };

            await expect(
                ownershipService.update(repository, {
                    accounts: ['account-1'],
                } as any)
            ).rejects.toMatchObject({
                response: { message: 'chatbot.error.accountsTaken' },
            });
            expect(chatbotRepository.save).not.toHaveBeenCalled();
        });

        it('treats an account whose owner chatbot is soft-deleted as free', async () => {
            accountRepository.find.mockResolvedValue([
                {
                    id: 'account-1',
                    chatbot: { id: 'gone', deletedAt: new Date() },
                },
            ]);

            await expect(
                ownershipService.create(makeDto(['account-1']))
            ).resolves.toBeDefined();
        });
    });

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
                { invalidate: jest.fn() } as any,
                { find: jest.fn(async () => []) } as any
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
