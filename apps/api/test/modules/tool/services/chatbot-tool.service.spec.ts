import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ChatbotToolService } from 'src/modules/tool/services/chatbot-tool.service';
import { ChatbotToolRepository } from 'src/modules/tool/repository/repositories/chatbot-tool.repository';
import { ToolRepository } from 'src/modules/tool/repository/repositories/tool.repository';
import { ChatbotToolEntity } from 'src/modules/tool/repository/entities/chatbot-tool.entity';
import { ENUM_TOOL_STATUS } from 'src/modules/tool/enums/tool-status.enum';
import { ChatbotCacheService } from 'src/modules/ai-cache/services/chatbot-cache.service';

describe('ChatbotToolService', () => {
    let svc: ChatbotToolService;

    const mockEm = {
        persistAndFlush: jest.fn(),
        flush: jest.fn(),
        removeAndFlush: jest.fn(),
        // enable() builds chatbot/tool refs via em.getReference on create.
        getReference: jest.fn((_cls: any, id: string) => ({ id })),
    };
    const mockChatbotToolRepo: any = {
        getEntityManager: () => mockEm,
        create: jest.fn(data => Object.assign(new ChatbotToolEntity(), data)),
        findOneByChatbotAndTool: jest.fn(),
    };
    const mockToolRepo: any = {
        findOneInWorkspace: jest.fn(),
    };

    beforeEach(async () => {
        jest.clearAllMocks();
        const mod = await Test.createTestingModule({
            providers: [
                ChatbotToolService,
                {
                    provide: ChatbotToolRepository,
                    useValue: mockChatbotToolRepo,
                },
                { provide: ToolRepository, useValue: mockToolRepo },
                {
                    provide: ChatbotCacheService,
                    useValue: { invalidate: jest.fn() },
                },
            ],
        }).compile();
        svc = mod.get(ChatbotToolService);
    });

    describe('enable', () => {
        it('creates a new ChatbotToolEntity when no row exists', async () => {
            mockToolRepo.findOneInWorkspace.mockResolvedValue({
                id: 't-1',
                status: ENUM_TOOL_STATUS.ACTIVE,
            });
            mockChatbotToolRepo.findOneByChatbotAndTool.mockResolvedValue(null);

            const result = await svc.enable('ws-1', 'cb-1', 't-1', {
                enabledActions: ['a', 'b'],
            });

            expect(mockChatbotToolRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    enabled: true,
                    enabledActions: ['a', 'b'],
                })
            );
            expect(mockEm.persistAndFlush).toHaveBeenCalled();
            expect(result.enabled).toBe(true);
            expect(result.enabledActions).toEqual(['a', 'b']);
        });

        it('flips enabled back to true on existing disabled row; re-applies actions from dto', async () => {
            mockToolRepo.findOneInWorkspace.mockResolvedValue({
                id: 't-1',
                status: ENUM_TOOL_STATUS.ACTIVE,
            });
            const existing = Object.assign(new ChatbotToolEntity(), {
                enabled: false,
                enabledActions: ['old'],
            });
            mockChatbotToolRepo.findOneByChatbotAndTool.mockResolvedValue(
                existing
            );

            const result = await svc.enable('ws-1', 'cb-1', 't-1', {
                enabledActions: ['new'],
            });

            expect(result.enabled).toBe(true);
            expect(result.enabledActions).toEqual(['new']);
            expect(mockEm.flush).toHaveBeenCalled();
            expect(mockChatbotToolRepo.create).not.toHaveBeenCalled();
        });

        it('preserves existing enabledActions when dto.enabledActions is undefined', async () => {
            mockToolRepo.findOneInWorkspace.mockResolvedValue({
                id: 't-1',
                status: ENUM_TOOL_STATUS.ACTIVE,
            });
            const existing = Object.assign(new ChatbotToolEntity(), {
                enabled: false,
                enabledActions: ['preserved'],
            });
            mockChatbotToolRepo.findOneByChatbotAndTool.mockResolvedValue(
                existing
            );

            const result = await svc.enable('ws-1', 'cb-1', 't-1', {});

            expect(result.enabled).toBe(true);
            expect(result.enabledActions).toEqual(['preserved']);
        });

        it("throws NotFound when tool doesn't exist in the workspace", async () => {
            mockToolRepo.findOneInWorkspace.mockResolvedValue(null);

            await expect(
                svc.enable('ws-1', 'cb-1', 't-1', {})
            ).rejects.toBeInstanceOf(NotFoundException);
        });
    });

    describe('disable', () => {
        it('removes the chatbot-tool row', async () => {
            mockToolRepo.findOneInWorkspace.mockResolvedValue({
                id: 't-1',
                status: ENUM_TOOL_STATUS.ACTIVE,
            });
            const existing = Object.assign(new ChatbotToolEntity(), {
                enabled: true,
            });
            mockChatbotToolRepo.findOneByChatbotAndTool.mockResolvedValue(
                existing
            );

            await svc.disable('ws-1', 'cb-1', 't-1');

            expect(mockEm.removeAndFlush).toHaveBeenCalledWith(existing);
        });

        it('throws NotFound when no row exists', async () => {
            mockToolRepo.findOneInWorkspace.mockResolvedValue({
                id: 't-1',
                status: ENUM_TOOL_STATUS.ACTIVE,
            });
            mockChatbotToolRepo.findOneByChatbotAndTool.mockResolvedValue(null);

            await expect(
                svc.disable('ws-1', 'cb-1', 't-1')
            ).rejects.toBeInstanceOf(NotFoundException);
        });

        it('throws NotFound when tool is not in workspace', async () => {
            mockToolRepo.findOneInWorkspace.mockResolvedValue(null);

            await expect(
                svc.disable('ws-1', 'cb-1', 't-1')
            ).rejects.toBeInstanceOf(NotFoundException);
        });
    });

    describe('updateActions', () => {
        it('replaces enabledActions on the existing row', async () => {
            mockToolRepo.findOneInWorkspace.mockResolvedValue({
                id: 't-1',
                status: ENUM_TOOL_STATUS.ACTIVE,
            });
            const existing = Object.assign(new ChatbotToolEntity(), {
                enabledActions: ['old'],
            });
            mockChatbotToolRepo.findOneByChatbotAndTool.mockResolvedValue(
                existing
            );

            const result = await svc.updateActions('ws-1', 'cb-1', 't-1', {
                enabledActions: ['x', 'y'],
            });

            expect(result.enabledActions).toEqual(['x', 'y']);
            expect(mockEm.flush).toHaveBeenCalled();
        });

        it('throws NotFound when no row exists', async () => {
            mockToolRepo.findOneInWorkspace.mockResolvedValue({
                id: 't-1',
                status: ENUM_TOOL_STATUS.ACTIVE,
            });
            mockChatbotToolRepo.findOneByChatbotAndTool.mockResolvedValue(null);

            await expect(
                svc.updateActions('ws-1', 'cb-1', 't-1', {
                    enabledActions: ['x'],
                })
            ).rejects.toBeInstanceOf(NotFoundException);
        });
    });
});
