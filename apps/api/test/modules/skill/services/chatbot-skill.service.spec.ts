import { EntityManager } from '@mikro-orm/postgresql';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ChatbotSkillRepository } from '../../../../src/modules/skill/repository/repositories/chatbot-skill.repository';
import { SkillRepository } from '../../../../src/modules/skill/repository/repositories/skill.repository';
import { ChatbotSkillService } from '../../../../src/modules/skill/services/chatbot-skill.service';
import { ChatbotCacheService } from '../../../../src/modules/ai-cache/services/chatbot-cache.service';

describe('ChatbotSkillService', () => {
    let service: ChatbotSkillService;

    const mockChatbotSkillRepo = {
        findOneByChatbotAndSkill: jest.fn(),
        findByChatbotId: jest.fn(),
        create: jest.fn(),
    };

    const mockSkillRepo = {
        findOneOwned: jest.fn(),
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
});
