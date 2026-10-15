import { EntityManager } from '@mikro-orm/postgresql';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ChatbotSkillRepository } from '../../../../src/modules/skill/repository/repositories/chatbot-skill.repository';
import { SkillRepository } from '../../../../src/modules/skill/repository/repositories/skill.repository';
import { ChatbotSkillService } from '../../../../src/modules/skill/services/chatbot-skill.service';
import { ChatbotCacheService } from '../../../../src/modules/ai-cache/services/chatbot-cache.service';
import { ChatbotToolRepository } from '../../../../src/modules/tool/repository/repositories/chatbot-tool.repository';
import { ToolRepository } from '../../../../src/modules/tool/repository/repositories/tool.repository';
import { ENUM_TOOL_STATUS } from '../../../../src/modules/tool/enums/tool-status.enum';

describe('ChatbotSkillService', () => {
    let service: ChatbotSkillService;

    const mockChatbotSkillRepo = {
        findOneByChatbotAndSkill: jest.fn(),
        findByChatbotId: jest.fn(),
        findBySkillId: jest.fn(),
        create: jest.fn(),
    };

    const mockChatbotToolRepo = { findByChatbotIds: jest.fn() };
    const mockToolRepo = { findByIdsInWorkspace: jest.fn() };

    const mockSkillRepo = {
        findOneOwned: jest.fn(),
        findOneReadable: jest.fn(),
    };

    const mockEntityManager = {
        flush: jest.fn().mockResolvedValue(undefined),
        persistAndFlush: jest.fn().mockResolvedValue(undefined),
        removeAndFlush: jest.fn().mockResolvedValue(undefined),
        getReference: jest.fn((_entity, id) => ({ id })),
    };

    const workspaceId = randomUUID();
    const chatbotId = randomUUID();
    const skillId = randomUUID();

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ChatbotSkillService,
                {
                    provide: ChatbotSkillRepository,
                    useValue: mockChatbotSkillRepo,
                },
                { provide: SkillRepository, useValue: mockSkillRepo },
                {
                    provide: ChatbotToolRepository,
                    useValue: mockChatbotToolRepo,
                },
                { provide: ToolRepository, useValue: mockToolRepo },
                { provide: EntityManager, useValue: mockEntityManager },
                {
                    provide: ChatbotCacheService,
                    useValue: { invalidate: jest.fn() },
                },
            ],
        }).compile();

        service = module.get<ChatbotSkillService>(ChatbotSkillService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('attach', () => {
        it('throws when the skill is not owned by the workspace', async () => {
            mockSkillRepo.findOneOwned.mockResolvedValue(null);

            await expect(
                service.attach(workspaceId, chatbotId, skillId, {} as any)
            ).rejects.toThrow(NotFoundException);
        });

        it('scopes the chatbot-skill lookup to the workspace (cross-tenant guard)', async () => {
            mockSkillRepo.findOneOwned.mockResolvedValue({ id: skillId });
            mockChatbotSkillRepo.findOneByChatbotAndSkill.mockResolvedValue(
                null
            );
            mockChatbotSkillRepo.create.mockReturnValue({ id: randomUUID() });

            await service.attach(workspaceId, chatbotId, skillId, {
                enabled: true,
            } as any);

            expect(
                mockChatbotSkillRepo.findOneByChatbotAndSkill
            ).toHaveBeenCalledWith(chatbotId, skillId, workspaceId);
        });

        it('re-enables an existing row instead of creating a duplicate', async () => {
            const existing: any = { id: randomUUID(), enabled: false };
            mockSkillRepo.findOneOwned.mockResolvedValue({ id: skillId });
            mockChatbotSkillRepo.findOneByChatbotAndSkill.mockResolvedValue(
                existing
            );

            const result = await service.attach(
                workspaceId,
                chatbotId,
                skillId,
                {
                    enabled: true,
                } as any
            );

            expect(result).toBe(existing);
            expect(existing.enabled).toBe(true);
            expect(mockChatbotSkillRepo.create).not.toHaveBeenCalled();
        });
    });

    describe('setEnabled', () => {
        it('throws when no chatbot-skill row exists in this workspace (cross-tenant guard)', async () => {
            mockSkillRepo.findOneOwned.mockResolvedValue({ id: skillId });
            mockChatbotSkillRepo.findOneByChatbotAndSkill.mockResolvedValue(
                null
            );

            await expect(
                service.setEnabled(workspaceId, chatbotId, skillId, false)
            ).rejects.toThrow(NotFoundException);
            expect(
                mockChatbotSkillRepo.findOneByChatbotAndSkill
            ).toHaveBeenCalledWith(chatbotId, skillId, workspaceId);
        });

        it('flips the enabled flag on the owned row', async () => {
            const row: any = { enabled: true };
            mockSkillRepo.findOneOwned.mockResolvedValue({ id: skillId });
            mockChatbotSkillRepo.findOneByChatbotAndSkill.mockResolvedValue(
                row
            );

            const result = await service.setEnabled(
                workspaceId,
                chatbotId,
                skillId,
                false
            );

            expect(result.enabled).toBe(false);
        });
    });

    describe('detach', () => {
        it('throws when no chatbot-skill row exists in this workspace (cross-tenant guard)', async () => {
            mockChatbotSkillRepo.findOneByChatbotAndSkill.mockResolvedValue(
                null
            );

            await expect(
                service.detach(workspaceId, chatbotId, skillId)
            ).rejects.toThrow(NotFoundException);
            expect(
                mockChatbotSkillRepo.findOneByChatbotAndSkill
            ).toHaveBeenCalledWith(chatbotId, skillId, workspaceId);
        });

        it('removes the row when found in-workspace', async () => {
            const row: any = { id: randomUUID() };
            mockChatbotSkillRepo.findOneByChatbotAndSkill.mockResolvedValue(
                row
            );

            await service.detach(workspaceId, chatbotId, skillId);

            expect(mockEntityManager.removeAndFlush).toHaveBeenCalledWith(row);
        });
    });

    describe('listByChatbot', () => {
        it('maps chatbot-skill rows to the list DTO', async () => {
            mockChatbotSkillRepo.findByChatbotId.mockResolvedValue([
                {
                    enabled: true,
                    skill: {
                        id: skillId,
                        name: 'Refund policy',
                        slug: 'refund-policy',
                        description: 'desc',
                        status: 'ACTIVE',
                    },
                },
            ]);

            const result = await service.listByChatbot(workspaceId, chatbotId);

            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                id: skillId,
                slug: 'refund-policy',
                enabled: true,
            });
            expect(mockChatbotSkillRepo.findByChatbotId).toHaveBeenCalledWith(
                chatbotId,
                workspaceId
            );
        });
    });

    describe('usage', () => {
        const lookup = {
            id: 'http-1',
            kind: 'HTTP',
            displayName: 'Lookup order',
        };
        const zendesk = {
            id: 'mcp-1',
            kind: 'MCP',
            displayName: 'Zendesk',
            discoveredActions: [
                { name: 'create_ticket' },
                { name: 'search' },
                { name: 'delete_all_tickets' },
            ],
        };

        it('lists the tools a STEPS skill calls and what each chatbot lacks', async () => {
            mockSkillRepo.findOneReadable.mockResolvedValue({
                id: skillId,
                format: 'STEPS',
                steps: [
                    { id: 'a', type: 'tool', toolId: 'http-1' },
                    {
                        id: 'b',
                        type: 'tool',
                        toolId: 'mcp-1',
                        action: 'create_ticket',
                    },
                    { id: 'c', type: 'tool', toolId: 'gone' },
                ],
            });
            mockToolRepo.findByIdsInWorkspace.mockResolvedValue([
                lookup,
                zendesk,
            ]);
            mockChatbotSkillRepo.findBySkillId.mockResolvedValue([
                { enabled: true, chatbot: { id: 'bot-1', name: 'Shop' } },
                { enabled: false, chatbot: { id: 'bot-2', name: 'Spa' } },
            ]);
            mockChatbotToolRepo.findByChatbotIds.mockResolvedValue([
                // bot-1 has the HTTP tool, and Zendesk without create_ticket
                { enabled: true, chatbot: { id: 'bot-1' }, tool: lookup },
                {
                    enabled: true,
                    chatbot: { id: 'bot-1' },
                    tool: zendesk,
                    enabledActions: ['search'],
                },
                // bot-2 has the HTTP tool switched off, and all Zendesk actions
                { enabled: false, chatbot: { id: 'bot-2' }, tool: lookup },
                {
                    enabled: true,
                    chatbot: { id: 'bot-2' },
                    tool: zendesk,
                    enabledActions: null,
                },
            ]);

            const usage = await service.usage(workspaceId, skillId);

            expect(usage.tools).toEqual([
                { id: 'http-1', name: 'Lookup order', kind: 'HTTP' },
                {
                    id: 'mcp-1',
                    name: 'Zendesk',
                    kind: 'MCP',
                    action: 'create_ticket',
                },
            ]);
            expect(usage.chatbots).toEqual([
                {
                    id: 'bot-1',
                    name: 'Shop',
                    enabled: true,
                    missingTools: [
                        { id: 'mcp-1', action: 'create_ticket' },
                        { id: 'gone' },
                    ],
                },
                {
                    id: 'bot-2',
                    name: 'Spa',
                    enabled: false,
                    missingTools: [{ id: 'http-1' }, { id: 'gone' }],
                },
            ]);
            expect(mockToolRepo.findByIdsInWorkspace).toHaveBeenCalledWith(
                ['http-1', 'mcp-1', 'gone'],
                workspaceId
            );
            expect(mockChatbotSkillRepo.findBySkillId).toHaveBeenCalledWith(
                skillId,
                workspaceId
            );
        });

        it('reports actions and tools the agent is not offered at runtime', async () => {
            const revoked = {
                id: 'http-2',
                kind: 'HTTP',
                displayName: 'Old API',
                status: ENUM_TOOL_STATUS.REVOKED,
            };
            mockSkillRepo.findOneReadable.mockResolvedValue({
                id: skillId,
                format: 'STEPS',
                steps: [
                    {
                        id: 'a',
                        type: 'tool',
                        toolId: 'mcp-1',
                        action: 'delete_all_tickets',
                    },
                    { id: 'b', type: 'tool', toolId: 'mcp-1', action: 'nope' },
                    { id: 'c', type: 'tool', toolId: 'http-2' },
                ],
            });
            mockToolRepo.findByIdsInWorkspace.mockResolvedValue([
                zendesk,
                revoked,
            ]);
            mockChatbotSkillRepo.findBySkillId.mockResolvedValue([
                { enabled: true, chatbot: { id: 'bot-1', name: 'Shop' } },
            ]);
            // No action list: only discovered, non-destructive actions.
            mockChatbotToolRepo.findByChatbotIds.mockResolvedValue([
                {
                    enabled: true,
                    chatbot: { id: 'bot-1' },
                    tool: zendesk,
                    enabledActions: null,
                },
                { enabled: true, chatbot: { id: 'bot-1' }, tool: revoked },
            ]);

            const usage = await service.usage(workspaceId, skillId);

            expect(usage.chatbots[0].missingTools).toEqual([
                { id: 'mcp-1', action: 'delete_all_tickets' },
                { id: 'mcp-1', action: 'nope' },
                { id: 'http-2' },
            ]);
        });

        it('returns no tools for a CONTENT skill and throws for an unknown one', async () => {
            mockSkillRepo.findOneReadable.mockResolvedValue({
                id: skillId,
                format: 'CONTENT',
                steps: null,
            });
            mockChatbotSkillRepo.findBySkillId.mockResolvedValue([]);

            await expect(service.usage(workspaceId, skillId)).resolves.toEqual({
                tools: [],
                chatbots: [],
            });
            expect(mockToolRepo.findByIdsInWorkspace).not.toHaveBeenCalled();

            mockSkillRepo.findOneReadable.mockResolvedValue(null);
            await expect(service.usage(workspaceId, skillId)).rejects.toThrow(
                NotFoundException
            );
        });
    });
});
