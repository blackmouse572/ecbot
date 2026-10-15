import { NotFoundException } from '@nestjs/common';
import { validate } from 'class-validator';
import { ENUM_ACTIVITY_ACTION } from '../../../../src/modules/activity/enums/activity.enum';
import { ENUM_POLICY_SUBJECT } from '../../../../src/modules/policy/enums/policy.enum';
import { ChatbotController } from '../../../../src/modules/chatbot/controllers/chatbot.controller';
import {
    ENUM_CHATBOT_LANGUAGE,
    ENUM_CHATBOT_MODEL_PROVIDER,
    ENUM_CHATBOT_STATUS,
    ENUM_CHATBOT_TYPE,
} from '../../../../src/modules/chatbot/enums/chatbot.enum';
import { ChatbotCreateRequestDto } from '../../../../src/modules/chatbot/dtos/request/chatbot.create.request.dto';
import { ChatbotUpdateRequestDto } from '../../../../src/modules/chatbot/dtos/request/chatbot.update.request.dto';
import { UserEntity } from '../../../../src/modules/user/repository/entities/user.entity';
import { WorkspaceEntity } from '../../../../src/modules/workspace/repository/entities/workspace.entity';

const mockChatbot = {
    id: 'chatbot-id-1',
    name: 'Test Bot',
    avatar: null,
    generalKnowledge: 'General knowledge',
    status: ENUM_CHATBOT_STATUS.ACTIVE,
    type: ENUM_CHATBOT_TYPE.BEAUTY,
    primaryLanguage: ENUM_CHATBOT_LANGUAGE.EN,
    deferedLanguage: ENUM_CHATBOT_LANGUAGE.EN,
    welcomeMessage: 'Hello!',
    fallbackMessage: 'I cannot help with that.',
    modelProvider: ENUM_CHATBOT_MODEL_PROVIDER.GOOGLE,
    modelTextName: 'google/gemini-2.5-flash',
    modelTemperature: 1.0,
    maxTokens: null,
    typingIndicator: true,
    autoRead: true,
    accounts: [],
    workspace: { id: 'workspace-id-1' },
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
};

const mockClonedChatbot = {
    id: 'chatbot-id-cloned',
    name: 'Test Bot (Copy)',
    avatar: null,
    generalKnowledge: 'General knowledge',
    status: ENUM_CHATBOT_STATUS.INACTIVE,
    type: ENUM_CHATBOT_TYPE.BEAUTY,
    primaryLanguage: ENUM_CHATBOT_LANGUAGE.EN,
    deferedLanguage: ENUM_CHATBOT_LANGUAGE.EN,
    welcomeMessage: 'Hello!',
    fallbackMessage: 'I cannot help with that.',
    modelProvider: ENUM_CHATBOT_MODEL_PROVIDER.GOOGLE,
    modelTextName: 'google/gemini-2.5-flash',
    modelTemperature: 1.0,
    maxTokens: null,
    typingIndicator: true,
    autoRead: true,
    accounts: [],
    workspace: { id: 'workspace-id-1' },
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
};

const mockChatbotService = {
    findAll: jest.fn(),
    getTotal: jest.fn(),
    findOne: jest.fn(),
    findOneById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    mapList: jest.fn(),
    mapDetails: jest.fn(),
    clone: jest.fn(),
    linkBatchAccounts: jest.fn(),
    unarchive: jest.fn(),
};

const mockPaginationService = {
    totalPage: jest.fn(),
};

const mockActivityService = {
    createByUserWithWorkspace: jest.fn(),
};

// Unused by any path this spec exercises — kept as empty stand-ins so the
// constructor's positional args line up with ChatbotController's real
// parameter order below.
const mockChatbotAIService = {};
const mockManifestBuilderService = {};

const mockPreviewService = {
    streamTo: jest.fn(),
};

const mockPreviewSessionService = {
    workspaceKey: jest.fn().mockReturnValue('preview-key'),
};

const mockShareTokenService = {
    create: jest.fn(),
};

const mockConfigService = {
    get: jest.fn().mockReturnValue('https://app.example.com'),
};

const mockModelCatalogService = {
    list: jest.fn(),
};

const mockWorkspace = {
    id: 'workspace-id-1',
    name: 'Test Workspace',
} as WorkspaceEntity;

const mockUser = {
    id: 'user-id-1',
    name: 'Test User',
} as UserEntity;

function buildController(): ChatbotController {
    return new ChatbotController(
        mockChatbotService as any,
        mockPaginationService as any,
        mockActivityService as any,
        mockChatbotAIService as any,
        mockManifestBuilderService as any,
        mockPreviewService as any,
        mockPreviewSessionService as any,
        mockShareTokenService as any,
        mockConfigService as any,
        mockModelCatalogService as any
    );
}

describe('ChatbotController', () => {
    let controller: ChatbotController;

    beforeEach(() => {
        jest.clearAllMocks();
        controller = buildController();
    });

    describe('model id validation', () => {
        it('accepts a free-form OpenRouter model id', async () => {
            const dto = new ChatbotCreateRequestDto();
            dto.name = 'Bot';
            dto.type = ENUM_CHATBOT_TYPE.BEAUTY;
            dto.primaryLanguage = ENUM_CHATBOT_LANGUAGE.EN;
            dto.modelTextName = 'anthropic/claude-sonnet-4.5';
            dto.typingIndicator = true;
            dto.autoRead = true;
            dto.workspace = 'workspace-id-1';

            const errors = await validate(dto);
            const modelError = errors.find(e => e.property === 'modelTextName');
            expect(modelError).toBeUndefined();
        });

        it('rejects an empty modelTextName', async () => {
            const dto = new ChatbotCreateRequestDto();
            dto.name = 'Bot';
            dto.type = ENUM_CHATBOT_TYPE.BEAUTY;
            dto.primaryLanguage = ENUM_CHATBOT_LANGUAGE.EN;
            dto.modelTextName = '';
            dto.typingIndicator = true;
            dto.autoRead = true;
            dto.workspace = 'workspace-id-1';

            const errors = await validate(dto);
            const modelError = errors.find(e => e.property === 'modelTextName');
            expect(modelError).toBeDefined();
        });
    });

    describe('models', () => {
        it('returns the mapped model catalog list', async () => {
            const mockModel = {
                id: 'anthropic/claude-sonnet-4.5',
                name: 'Claude Sonnet 4.5',
                provider: 'anthropic',
                contextLength: 200000,
                description: 'Anthropic flagship model',
            };
            mockModelCatalogService.list.mockResolvedValue([mockModel]);

            const result = await controller.models();

            expect(mockModelCatalogService.list).toHaveBeenCalled();
            expect(result).toEqual({ data: [mockModel] });
        });
    });

    describe('findOne', () => {
        it('returns a chatbot when it exists', async () => {
            mockChatbotService.findOne.mockResolvedValue(mockChatbot);
            mockChatbotService.mapDetails.mockReturnValue(mockChatbot);

            const result = await controller.findOne(
                mockWorkspace,
                mockChatbot.id
            );

            expect(mockChatbotService.findOne).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: mockChatbot.id,
                    workspace: mockWorkspace.id,
                }),
                expect.any(Object)
            );
            expect(result.data).toEqual(mockChatbot);
        });

        it('throws NotFoundException when chatbot does not exist', async () => {
            mockChatbotService.findOne.mockResolvedValue(null);

            await expect(
                controller.findOne(mockWorkspace, 'nonexistent-id')
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('update', () => {
        const updateDto: ChatbotUpdateRequestDto = {
            name: 'Updated Bot',
            type: ENUM_CHATBOT_TYPE.FASHION,
            primaryLanguage: ENUM_CHATBOT_LANGUAGE.EN,
            modelTextName: 'anthropic/claude-haiku-4.5',
            modelTemperature: 1.0,
            typingIndicator: true,
            autoRead: true,
            guardrailEnabled: false,
            guardrailModelEnabled: false,
            guardrailEscalateOnBlock: true,
        };

        it('updates a chatbot successfully', async () => {
            const updatedChatbot = { ...mockChatbot, name: 'Updated Bot' };
            mockChatbotService.findOne.mockResolvedValue(mockChatbot);
            mockChatbotService.update.mockResolvedValue(updatedChatbot);
            mockChatbotService.mapList.mockReturnValue([updatedChatbot]);
            mockActivityService.createByUserWithWorkspace.mockResolvedValue(
                undefined
            );

            const result = await controller.update(
                mockWorkspace,
                mockChatbot.id,
                updateDto,
                mockUser
            );

            expect(mockChatbotService.update).toHaveBeenCalled();
            expect(result.data).toMatchObject({ name: 'Updated Bot' });
        });

        it('throws NotFoundException when chatbot does not exist', async () => {
            mockChatbotService.findOne.mockResolvedValue(null);

            await expect(
                controller.update(
                    mockWorkspace,
                    'nonexistent-id',
                    updateDto,
                    mockUser
                )
            ).rejects.toThrow(NotFoundException);
        });

        it('updates modelProvider to DeepSeek with pro model', async () => {
            const dto: ChatbotUpdateRequestDto = {
                ...updateDto,
                modelTextName: 'deepseek/deepseek-v4-pro',
            };
            const updatedChatbot = {
                ...mockChatbot,
                modelProvider: ENUM_CHATBOT_MODEL_PROVIDER.DEEPSEEK,
                modelTextName: 'deepseek/deepseek-v4-pro',
            };
            mockChatbotService.findOne.mockResolvedValue(mockChatbot);
            mockChatbotService.update.mockResolvedValue(updatedChatbot);
            mockChatbotService.mapList.mockReturnValue([updatedChatbot]);
            mockActivityService.createByUserWithWorkspace.mockResolvedValue(
                undefined
            );

            const result = await controller.update(
                mockWorkspace,
                mockChatbot.id,
                dto,
                mockUser
            );

            expect(result.data).toMatchObject({
                modelProvider: ENUM_CHATBOT_MODEL_PROVIDER.DEEPSEEK,
                modelTextName: 'deepseek/deepseek-v4-pro',
            });
        });

        it('passes only the keys the body sent to the service', async () => {
            const partialDto = {
                name: 'Only Name',
                dailyTokenCap: 10,
            } as ChatbotUpdateRequestDto;
            mockChatbotService.findOne.mockResolvedValue(mockChatbot);
            mockChatbotService.update.mockResolvedValue(mockChatbot);
            mockChatbotService.mapList.mockReturnValue([mockChatbot]);
            mockActivityService.createByUserWithWorkspace.mockResolvedValue(
                undefined
            );

            await controller.update(
                mockWorkspace,
                mockChatbot.id,
                partialDto,
                mockUser
            );

            const editableFields = mockChatbotService.update.mock.calls[0][1];
            expect(editableFields).toStrictEqual({ name: 'Only Name' });
        });

        it('passes null through so a client can clear a field', async () => {
            const dto = {
                welcomeMessage: null,
            } as unknown as ChatbotUpdateRequestDto;
            mockChatbotService.findOne.mockResolvedValue(mockChatbot);
            mockChatbotService.update.mockResolvedValue(mockChatbot);
            mockChatbotService.mapList.mockReturnValue([mockChatbot]);
            mockActivityService.createByUserWithWorkspace.mockResolvedValue(
                undefined
            );

            await controller.update(
                mockWorkspace,
                mockChatbot.id,
                dto,
                mockUser
            );

            expect(mockChatbotService.update.mock.calls[0][1]).toStrictEqual({
                welcomeMessage: null,
            });
        });
        // ChatbotService.update edits the loaded entity in place, so the
        // mock does the same to catch a diff taken after the write.
        const updateInPlace = (entity: any, fields: any) =>
            Promise.resolve(Object.assign(entity, fields));

        it('logs the old and new value of each changed field', async () => {
            const chatbot = { ...mockChatbot, name: 'Old Bot' };
            mockChatbotService.findOne.mockResolvedValue(chatbot);
            mockChatbotService.update.mockImplementation(updateInPlace);
            mockChatbotService.mapList.mockReturnValue([chatbot]);

            await controller.update(
                mockWorkspace,
                chatbot.id,
                { name: 'New Bot' } as ChatbotUpdateRequestDto,
                mockUser
            );

            expect(
                mockActivityService.createByUserWithWorkspace
            ).toHaveBeenCalledWith(
                mockUser,
                mockWorkspace,
                expect.objectContaining({
                    metadata: expect.objectContaining({
                        name: 'New Bot',
                        old: { name: 'Old Bot' },
                        new: { name: 'New Bot' },
                    }),
                })
            );
        });

        // The edit form always sends the linked account ids back.
        const withLinkedAccounts = (ids: string[]) => ({
            ...mockChatbot,
            accounts: {
                loadItems: jest.fn().mockResolvedValue(ids.map(id => ({ id }))),
            },
        });

        it('logs no activity when the form resends the same linked accounts', async () => {
            const chatbot = withLinkedAccounts(['a1']);
            mockChatbotService.findOne.mockResolvedValue(chatbot);
            mockChatbotService.update.mockResolvedValue(chatbot);
            mockChatbotService.mapList.mockReturnValue([chatbot]);

            await controller.update(
                mockWorkspace,
                chatbot.id,
                { accounts: ['a1'] } as ChatbotUpdateRequestDto,
                mockUser
            );

            expect(
                mockActivityService.createByUserWithWorkspace
            ).not.toHaveBeenCalled();
        });

        it('logs the old and new linked account ids when they change', async () => {
            const chatbot = withLinkedAccounts(['a1']);
            mockChatbotService.findOne.mockResolvedValue(chatbot);
            mockChatbotService.update.mockResolvedValue(chatbot);
            mockChatbotService.mapList.mockReturnValue([chatbot]);

            await controller.update(
                mockWorkspace,
                chatbot.id,
                { accounts: ['a1', 'a2'] } as ChatbotUpdateRequestDto,
                mockUser
            );

            expect(
                mockActivityService.createByUserWithWorkspace
            ).toHaveBeenCalledWith(
                mockUser,
                mockWorkspace,
                expect.objectContaining({
                    metadata: expect.objectContaining({
                        old: { accounts: ['a1'] },
                        new: { accounts: ['a1', 'a2'] },
                    }),
                })
            );
        });

        it('logs no activity when the save changed nothing', async () => {
            const chatbot = { ...mockChatbot, name: 'Same Bot' };
            mockChatbotService.findOne.mockResolvedValue(chatbot);
            mockChatbotService.update.mockImplementation(updateInPlace);
            mockChatbotService.mapList.mockReturnValue([chatbot]);
            mockActivityService.createByUserWithWorkspace.mockClear();

            await controller.update(
                mockWorkspace,
                chatbot.id,
                { name: 'Same Bot' } as ChatbotUpdateRequestDto,
                mockUser
            );

            expect(
                mockActivityService.createByUserWithWorkspace
            ).not.toHaveBeenCalled();
        });
    });

    describe('unarchive', () => {
        it('unarchives the chatbot and logs UNARCHIVE_CHATBOT', async () => {
            mockChatbotService.findOne.mockResolvedValue(mockChatbot);
            mockChatbotService.mapList.mockReturnValue([
                { id: mockChatbot.id },
            ]);

            const result = await controller.unarchive(
                mockWorkspace,
                mockChatbot.id,
                mockUser
            );

            expect(mockChatbotService.unarchive).toHaveBeenCalledWith(
                mockChatbot,
                { actionBy: mockUser.id }
            );
            expect(
                mockActivityService.createByUserWithWorkspace
            ).toHaveBeenCalledWith(mockUser, mockWorkspace, {
                action: ENUM_ACTIVITY_ACTION.UNARCHIVE_CHATBOT,
                subject: ENUM_POLICY_SUBJECT.CHATBOT,
                metadata: { id: mockChatbot.id, name: mockChatbot.name },
            });
            expect(result.data).toEqual({ id: mockChatbot.id });
        });

        it('throws NotFoundException when chatbot does not exist', async () => {
            mockChatbotService.findOne.mockResolvedValue(null);

            await expect(
                controller.unarchive(mockWorkspace, 'nonexistent-id', mockUser)
            ).rejects.toThrow(NotFoundException);
            expect(
                mockActivityService.createByUserWithWorkspace
            ).not.toHaveBeenCalled();
        });
    });

    describe('linkAccount', () => {
        it('returns the service result (linked/skipped) as the response data, not a mapped chatbot', async () => {
            mockChatbotService.findOne.mockResolvedValue(mockChatbot);
            mockChatbotService.linkBatchAccounts.mockResolvedValue({
                linked: ['a1'],
                skipped: [{ id: 'a2', name: 'Taken Account' }],
            });
            mockActivityService.createByUserWithWorkspace.mockResolvedValue(
                undefined
            );

            const result = await controller.linkAccount(
                mockWorkspace,
                mockChatbot.id,
                { accounts: ['a1', 'a2'] },
                mockUser
            );

            expect(mockChatbotService.linkBatchAccounts).toHaveBeenCalledWith(
                mockChatbot,
                ['a1', 'a2'],
                { actionBy: mockUser.id }
            );
            expect(result.data).toEqual({
                linked: ['a1'],
                skipped: [{ id: 'a2', name: 'Taken Account' }],
            });
        });

        it('throws NotFoundException when chatbot does not exist', async () => {
            mockChatbotService.findOne.mockResolvedValue(null);

            await expect(
                controller.linkAccount(
                    mockWorkspace,
                    'nonexistent-id',
                    { accounts: ['a1'] },
                    mockUser
                )
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('clone', () => {
        const mockCloneDto = { name: 'My Clone' };

        it('should clone a chatbot and return cloned data', async () => {
            mockChatbotService.findOne.mockResolvedValue(mockChatbot);
            mockChatbotService.clone.mockResolvedValue(mockClonedChatbot);
            mockChatbotService.mapList.mockReturnValue([
                { id: mockClonedChatbot.id },
            ]);

            const result = await controller.clone(
                mockWorkspace,
                mockChatbot.id,
                mockCloneDto,
                mockUser
            );

            expect(mockChatbotService.clone).toHaveBeenCalledWith(
                mockChatbot.id,
                mockWorkspace.id,
                mockCloneDto,
                { actionBy: mockUser.id }
            );
            // Audit log must record the SOURCE's name, not the clone's.
            expect(mockChatbotService.findOne).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: mockChatbot.id,
                    workspace: mockWorkspace.id,
                })
            );
            expect(
                mockActivityService.createByUserWithWorkspace
            ).toHaveBeenCalledWith(mockUser, mockWorkspace, {
                action: 'clone_chatbot',
                subject: 'CHATBOT',
                metadata: {
                    sourceId: mockChatbot.id,
                    sourceName: mockChatbot.name,
                    newId: mockClonedChatbot.id,
                    newName: mockClonedChatbot.name,
                },
            });
            expect(result.data).toBeDefined();
        });

        it('should propagate NotFoundException from service', async () => {
            mockChatbotService.findOne.mockResolvedValue(mockChatbot);
            mockChatbotService.clone.mockRejectedValue(
                new NotFoundException({
                    statusCode: 404,
                    message: 'chatbot.error.notFound',
                })
            );

            await expect(
                controller.clone(
                    mockWorkspace,
                    mockChatbot.id,
                    mockCloneDto,
                    mockUser
                )
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('delete', () => {
        it('soft-deletes a chatbot successfully', async () => {
            const deletedChatbot = { ...mockChatbot, deletedAt: new Date() };
            mockChatbotService.findOne.mockResolvedValue(mockChatbot);
            mockChatbotService.softDelete.mockResolvedValue(deletedChatbot);
            mockChatbotService.mapList.mockReturnValue([deletedChatbot]);
            mockActivityService.createByUserWithWorkspace.mockResolvedValue(
                undefined
            );

            const result = await controller.delete(
                mockWorkspace,
                mockUser,
                mockChatbot.id
            );

            expect(mockChatbotService.softDelete).toHaveBeenCalledWith(
                mockChatbot,
                { actionBy: mockUser.id }
            );
            expect(result.data).toBeDefined();
        });

        it('throws NotFoundException when chatbot does not exist', async () => {
            mockChatbotService.findOne.mockResolvedValue(null);

            await expect(
                controller.delete(mockWorkspace, mockUser, 'nonexistent-id')
            ).rejects.toThrow(NotFoundException);
        });
    });
});
