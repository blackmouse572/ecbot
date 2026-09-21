import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager } from '@mikro-orm/core';
// ChatbotRepository.getEntityManager() returns the postgres-flavoured
// SqlEntityManager (see DatabaseRepository); the DI token above stays
// core's EntityManager to match ChatbotService's own constructor param.
import { EntityManager as SqlEntityManager } from '@mikro-orm/postgresql';
import { ChatbotService } from '../../../../src/modules/chatbot/services/chatbot.service';
import { ChatbotCacheService } from '../../../../src/modules/ai-cache/services/chatbot-cache.service';
import { ChatbotRepository } from '../../../../src/modules/chatbot/repository/repositories/chatbot.repository';
import { ChatbotEntity } from '../../../../src/modules/chatbot/repository/entities/chatbot.entity';
import { WorkspaceEntity } from '../../../../src/modules/workspace/repository/entities/workspace.entity';
import {
    ENUM_CHATBOT_STATUS,
    ENUM_CHATBOT_TYPE,
    ENUM_CHATBOT_LANGUAGE,
    ENUM_CHATBOT_MODEL_PROVIDER,
} from '../../../../src/modules/chatbot/enums/chatbot.enum';
import { NotFoundException } from '@nestjs/common';
import { CloneChatbotRequestDto } from '../../../../src/modules/chatbot/dtos/request/chatbot.clone.request.dto';
import { ChatbotToolEntity } from '../../../../src/modules/tool/repository/entities/chatbot-tool.entity';
import { ChatbotKnowledgeItemEntity } from '../../../../src/modules/knowledge-base/repository/entities/chatbot-knowledge-item.entity';
import { RAGEntity } from '../../../../src/modules/rag/repository/entities/rag.entity';
import { ENUM_RAG_STATUS } from '../../../../src/modules/rag/enums/rag.status.enum';

function makeSource(): ChatbotEntity {
    const ws = new WorkspaceEntity();
    ws.id = 'ws-1';

    const source = new ChatbotEntity();
    source.id = 'src-1';
    source.name = 'Original Bot';
    source.avatar = 'https://example.com/avatar.png';
    source.generalKnowledge = 'Test knowledge';
    source.workspace = ws;
    source.typingIndicator = true;
    source.autoRead = false;
    source.status = ENUM_CHATBOT_STATUS.ACTIVE;
    source.type = ENUM_CHATBOT_TYPE.BEAUTY;
    source.primaryLanguage = ENUM_CHATBOT_LANGUAGE.EN;
    source.deferedLanguage = ENUM_CHATBOT_LANGUAGE.VI;
    source.welcomeMessage = 'Hello!';
    source.fallbackMessage = 'I cannot answer that.';
    source.modelProvider = ENUM_CHATBOT_MODEL_PROVIDER.ANTHROPIC;
    source.modelTextName = 'anthropic/claude-sonnet-4.5';
    source.modelTemperature = 0.7;
    source.maxTokens = 2000;
    source.dailyTokenCap = 100_000;
    source.monthlyTokenCap = 2_000_000;
    source.handoffFallbackThreshold = 5;
    source.handoffMessage = 'Connecting to human...';
    source.handoffKeywords = ['human', 'agent'];
    source.guardrailEnabled = true;
    source.guardrailModelEnabled = false;
    source.guardrailCustomInstruction = 'Block competitor pricing';
    source.guardrailEscalateOnBlock = true;
    source.followupRules = 'Follow up after 24h';
    return source;
}

describe('ChatbotService.clone()', () => {
    let service: ChatbotService;
    let chatbotRepository: jest.Mocked<ChatbotRepository>;
    let em: jest.Mocked<SqlEntityManager>;

    const workspaceId = 'ws-1';
    const sourceId = 'src-1';

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ChatbotService,
                {
                    provide: ChatbotRepository,
                    useValue: {
                        findOne: jest.fn(),
                        getEntityManager: jest.fn(),
                    },
                },
                {
                    provide: EntityManager,
                    useValue: {
                        create: jest.fn(),
                        persist: jest.fn(),
                        flush: jest.fn(),
                        find: jest.fn().mockResolvedValue([]),
                        getReference: jest
                            .fn()
                            .mockImplementation((_, id) => ({ id })),
                    },
                },
                {
                    provide: ChatbotCacheService,
                    useValue: { invalidate: jest.fn() },
                },
            ],
        }).compile();

        service = module.get<ChatbotService>(ChatbotService);
        chatbotRepository = module.get(ChatbotRepository);
        em = module.get(EntityManager);
    });

    it('throws NotFoundException when source not found', async () => {
        chatbotRepository.findOne.mockResolvedValue(null);

        await expect(service.clone(sourceId, workspaceId, {})).rejects.toThrow(
            NotFoundException
        );
    });

    it('clones all fields and sets status to INACTIVE', async () => {
        const source = makeSource();
        chatbotRepository.findOne.mockResolvedValue(source);
        chatbotRepository.getEntityManager.mockReturnValue(em);

        const cloned = new ChatbotEntity();
        cloned.id = 'cloned-1';
        cloned.name = 'Original Bot (Copy)';
        em.create.mockReturnValue(cloned);

        const result = await service.clone(sourceId, workspaceId, {});

        expect(em.create).toHaveBeenCalledWith(
            ChatbotEntity,
            expect.objectContaining({
                name: 'Original Bot (Copy)',
                avatar: 'https://example.com/avatar.png',
                status: ENUM_CHATBOT_STATUS.INACTIVE,
                generalKnowledge: 'Test knowledge',
                type: ENUM_CHATBOT_TYPE.BEAUTY,
                // `clone()` hand-lists what it copies, so a new column is
                // silently left behind — a capped bot would clone into an
                // uncapped one, quietly widening what it may spend.
                dailyTokenCap: 100_000,
                monthlyTokenCap: 2_000_000,
            })
        );
        // Atomic clone: persist (no flush) so the chatbot + junction rows
        // commit together in the single flush below.
        expect(em.persist).toHaveBeenCalledWith(cloned);
        expect(em.flush).toHaveBeenCalled();
    });

    // A clone that silently drops the caps is an uncapped bot on the same
    // quota — the spend risk the caps exist to prevent.
    it('carries the per-chatbot token budget caps to the clone', async () => {
        const source = makeSource();
        chatbotRepository.findOne.mockResolvedValue(source);
        chatbotRepository.getEntityManager.mockReturnValue(em);
        em.create.mockReturnValue(new ChatbotEntity());

        await service.clone(sourceId, workspaceId, {});

        expect(em.create).toHaveBeenCalledWith(
            ChatbotEntity,
            expect.objectContaining({
                dailyTokenCap: 100_000,
                monthlyTokenCap: 2_000_000,
            })
        );
    });

    it('uses custom name from DTO', async () => {
        const source = makeSource();
        chatbotRepository.findOne.mockResolvedValue(source);
        chatbotRepository.getEntityManager.mockReturnValue(em);

        const cloned = new ChatbotEntity();
        cloned.id = 'cloned-1';
        cloned.name = 'My Clone';
        em.create.mockReturnValue(cloned);

        await service.clone(sourceId, workspaceId, { name: 'My Clone' });

        expect(em.create).toHaveBeenCalledWith(
            ChatbotEntity,
            expect.objectContaining({ name: 'My Clone' })
        );
    });

    it('uses custom avatar from DTO', async () => {
        const source = makeSource();
        chatbotRepository.findOne.mockResolvedValue(source);
        chatbotRepository.getEntityManager.mockReturnValue(em);

        const cloned = new ChatbotEntity();
        cloned.id = 'cloned-1';
        em.create.mockReturnValue(cloned);

        await service.clone(sourceId, workspaceId, {
            avatar: 'https://example.com/new.png',
        });

        expect(em.create).toHaveBeenCalledWith(
            ChatbotEntity,
            expect.objectContaining({ avatar: 'https://example.com/new.png' })
        );
    });

    it('clones tool junction records when cloneTools=true', async () => {
        const source = makeSource();
        chatbotRepository.findOne.mockResolvedValue(source);
        chatbotRepository.getEntityManager.mockReturnValue(em);

        const toolEntity = { id: 'tool-1' };
        const sourceTools = [
            Object.assign(new ChatbotToolEntity(), {
                chatbot: { id: sourceId },
                tool: toolEntity,
                enabled: true,
                enabledActions: ['action-1'],
            }),
        ];
        em.find.mockResolvedValue(sourceTools as any);

        const cloned = new ChatbotEntity();
        cloned.id = 'cloned-1';
        em.create.mockReturnValueOnce(cloned);

        await service.clone(sourceId, workspaceId, { cloneTools: true });

        expect(em.find).toHaveBeenCalledWith(ChatbotToolEntity, {
            chatbot: sourceId,
            deleted: false,
        });
        expect(em.flush).toHaveBeenCalled();
    });

    it('does not clone tools when cloneTools=false', async () => {
        const source = makeSource();
        chatbotRepository.findOne.mockResolvedValue(source);
        chatbotRepository.getEntityManager.mockReturnValue(em);

        const cloned = new ChatbotEntity();
        cloned.id = 'cloned-1';
        em.create.mockReturnValue(cloned);

        await service.clone(sourceId, workspaceId, { cloneTools: false });

        expect(em.find).not.toHaveBeenCalledWith(
            ChatbotToolEntity,
            expect.objectContaining({ chatbot: sourceId })
        );
    });

    it('clones knowledge item junction records when cloneKnowledgeItems=true', async () => {
        const source = makeSource();
        chatbotRepository.findOne.mockResolvedValue(source);
        chatbotRepository.getEntityManager.mockReturnValue(em);

        const sourceItems = [
            Object.assign(new ChatbotKnowledgeItemEntity(), {
                chatbot: { id: sourceId },
                knowledgeItem: { id: 'ki-1' },
                isActive: true,
                priority: 5,
            }),
        ];
        em.find.mockImplementation((entity: any) => {
            if (entity === ChatbotKnowledgeItemEntity)
                return Promise.resolve(sourceItems as any);
            return Promise.resolve([]);
        });

        const cloned = new ChatbotEntity();
        cloned.id = 'cloned-1';
        em.create.mockReturnValueOnce(cloned);

        await service.clone(sourceId, workspaceId, {
            cloneKnowledgeItems: true,
        });

        expect(em.find).toHaveBeenCalledWith(ChatbotKnowledgeItemEntity, {
            chatbot: sourceId,
            deletedAt: null,
        });
        expect(em.flush).toHaveBeenCalled();
    });

    it('clones RAG records with PENDING status when cloneRags=true', async () => {
        const source = makeSource();
        chatbotRepository.findOne.mockResolvedValue(source);
        chatbotRepository.getEntityManager.mockReturnValue(em);

        const sourceRags = [
            Object.assign(new RAGEntity(), {
                chatbot: { id: sourceId },
                attachment: { url: 's3://bucket/file.pdf', key: 'file.pdf' },
                status: 'COMPLETED',
            }),
        ];
        em.find.mockImplementation((entity: any) => {
            if (entity === RAGEntity) return Promise.resolve(sourceRags as any);
            return Promise.resolve([]);
        });

        const cloned = new ChatbotEntity();
        cloned.id = 'cloned-1';
        em.create.mockReturnValueOnce(cloned);

        await service.clone(sourceId, workspaceId, { cloneRags: true });

        expect(em.create).toHaveBeenCalledWith(
            RAGEntity,
            expect.objectContaining({ status: ENUM_RAG_STATUS.PENDING })
        );
        expect(em.flush).toHaveBeenCalled();
    });

    it('creates chatbot only when all flags are false', async () => {
        const source = makeSource();
        chatbotRepository.findOne.mockResolvedValue(source);
        chatbotRepository.getEntityManager.mockReturnValue(em);

        const cloned = new ChatbotEntity();
        cloned.id = 'cloned-1';
        em.create.mockReturnValue(cloned);

        const result = await service.clone(sourceId, workspaceId, {
            cloneTools: false,
            cloneKnowledgeItems: false,
            cloneRags: false,
        });

        expect(em.find).not.toHaveBeenCalled();
        expect(em.create).toHaveBeenCalledWith(
            ChatbotEntity,
            expect.any(Object)
        );
    });
});
