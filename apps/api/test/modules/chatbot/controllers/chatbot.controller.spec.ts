import { NotFoundException } from '@nestjs/common';
import { validate } from 'class-validator';
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

        it('passes every editable key to the service, undefined when unsent', async () => {
            const partialDto = { name: 'Only Name' } as ChatbotUpdateRequestDto;
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
            expect(Object.keys(editableFields)).toHaveLength(22);
            expect(editableFields).toHaveProperty('handoffMessage', undefined);
            expect(editableFields).not.toHaveProperty('dailyTokenCap');
            expect(editableFields).not.toHaveProperty('monthlyTokenCap');
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
