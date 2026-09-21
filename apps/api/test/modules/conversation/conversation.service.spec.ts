import { Test, TestingModule } from '@nestjs/testing';
import { ENUM_CONVERSATION_STATUS } from '../../../src/modules/conversation/enums/conversation.enum';
import { ConversationService } from '../../../src/modules/conversation/services/conversation.service';

describe('ConversationService', () => {
    let service: ConversationService;

    const mockConversationRepository = {
        findByChatbotAccountSender: jest.fn(),
        create: jest.fn(),
        findOneById: jest.fn(),
        findByWorkspace: jest.fn(),
        countByWorkspace: jest.fn(),
        updateEntity: jest.fn(),
        getTotal: jest.fn(),
    };

    const mockWorkspaceMemberRepository = {
        findActiveByWorkspace: jest.fn(),
    };

    const mockNotificationService = {
        create: jest.fn(),
    };

    const mockChatbotAIService = {
        deleteSession: jest.fn().mockResolvedValue(undefined),
    };

    const mockConversationReadRepository = {
        upsertRead: jest.fn().mockResolvedValue(undefined),
        getUnreadCounts: jest.fn().mockResolvedValue(new Map()),
        findByOperatorConversation: jest.fn().mockResolvedValue(null),
    };

    // #170: resolving a conversation schedules the tag classifier.
    const mockCustomerTagClassifierService = {
        scheduleOnResolved: jest.fn().mockResolvedValue(undefined),
        scheduleAfterMessage: jest.fn().mockResolvedValue(undefined),
    };

    const mockModuleRef = {
        get: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ConversationService,
                {
                    provide: 'ConversationRepository',
                    useValue: mockConversationRepository,
                },
                {
                    provide: 'WorkspaceMemberRepository',
                    useValue: mockWorkspaceMemberRepository,
                },
                {
                    provide: 'NotificationService',
                    useValue: mockNotificationService,
                },
                {
                    provide: 'ChatbotAIService',
                    useValue: mockChatbotAIService,
                },
            ],
        })
            .overrideProvider(ConversationService)
            .useFactory({
                factory: () =>
                    new ConversationService(
                        mockConversationRepository as any,
                        mockWorkspaceMemberRepository as any,
                        mockNotificationService as any,
                        mockChatbotAIService as any,
                        mockConversationReadRepository as any,
                        mockCustomerTagClassifierService as any,
                        mockModuleRef as any
                    ),
            })
            .compile();

        service = module.get<ConversationService>(ConversationService);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('findOrCreate', () => {
        it('should return existing conversation if found', async () => {
            const existingConversation = {
                id: 'conv-1',
                chatbot: 'chatbot-1',
                account: 'account-1',
                senderId: 'sender-1',
                status: ENUM_CONVERSATION_STATUS.OPEN,
                fallbackCount: 0,
            };

            mockConversationRepository.findByChatbotAccountSender.mockResolvedValue(
                existingConversation
            );

            const result = await service.findOrCreate({
                chatbotId: 'chatbot-1',
                accountId: 'account-1',
                senderId: 'sender-1',
            });

            expect(result).toEqual(existingConversation);
            expect(
                mockConversationRepository.findByChatbotAccountSender
            ).toHaveBeenCalledWith('chatbot-1', 'account-1', 'sender-1');
            expect(mockConversationRepository.create).not.toHaveBeenCalled();
        });

        it('should create a new conversation if not found', async () => {
            const newConversation = {
                id: 'conv-new',
                chatbot: 'chatbot-1',
                account: 'account-1',
                senderId: 'sender-1',
                status: ENUM_CONVERSATION_STATUS.OPEN,
                fallbackCount: 0,
            };

            mockConversationRepository.findByChatbotAccountSender.mockResolvedValue(
                null
            );
            mockConversationRepository.create.mockResolvedValue(
                newConversation
            );

            const result = await service.findOrCreate({
                chatbotId: 'chatbot-1',
                accountId: 'account-1',
                senderId: 'sender-1',
            });

            expect(result).toEqual(newConversation);
            expect(mockConversationRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    senderId: 'sender-1',
                    status: ENUM_CONVERSATION_STATUS.OPEN,
                    fallbackCount: 0,
                })
            );
        });
    });

    describe('setBotEnabled', () => {
        it('should flip the bot off without raising an alarm (no handoffAt)', async () => {
            const conversation = { id: 'conv-1', botEnabled: true };

            mockConversationRepository.findOneById.mockResolvedValue(
                conversation
            );
            mockConversationRepository.updateEntity.mockResolvedValue({
                ...conversation,
                botEnabled: false,
            });

            await service.setBotEnabled('conv-1', false, 'Handling VIP myself');

            const [, patch] =
                mockConversationRepository.updateEntity.mock.calls[0];
            expect(patch.botEnabled).toBe(false);
            expect(patch.handoffReason).toBe('Handling VIP myself');
            expect(patch.handoffAt).toBeUndefined();
        });

        it('should clear handoff state when re-enabling the bot', async () => {
            const conversation = { id: 'conv-1', botEnabled: false };

            mockConversationRepository.findOneById.mockResolvedValue(
                conversation
            );
            mockConversationRepository.updateEntity.mockResolvedValue({
                ...conversation,
                botEnabled: true,
            });

            await service.setBotEnabled('conv-1', true);

            expect(
                mockConversationRepository.updateEntity
            ).toHaveBeenCalledWith(
                { id: 'conv-1' },
                expect.objectContaining({
                    botEnabled: true,
                    handoffAt: null,
                    handoffReason: null,
                    fallbackCount: 0,
                })
            );
        });

        // #140: an operator manually returning a handed-off conversation to the
        // bot is a handoff->bot resume point just like reopening a RESOLVED
        // conversation. Reseed-on-resume: wipe the AI checkpointer thread so the
        // next turn rebuilds full history (including OPERATOR messages sent
        // during handoff) from the DB.
        it('deletes the AI session when re-enabling the bot (handoff -> bot resume)', async () => {
            const conversation = { id: 'conv-1', botEnabled: false };

            mockConversationRepository.findOneById.mockResolvedValue(
                conversation
            );
            mockConversationRepository.updateEntity.mockResolvedValue({
                ...conversation,
                botEnabled: true,
            });

            await service.setBotEnabled('conv-1', true);
            await new Promise(resolve => setImmediate(resolve));

            expect(mockChatbotAIService.deleteSession).toHaveBeenCalledWith(
                'conv-1'
            );
        });

        it('does NOT delete the AI session when the bot is already enabled (true -> true no-op)', async () => {
            const conversation = { id: 'conv-1', botEnabled: true };

            mockConversationRepository.findOneById.mockResolvedValue(
                conversation
            );
            mockConversationRepository.updateEntity.mockResolvedValue({
                ...conversation,
                botEnabled: true,
            });

            await service.setBotEnabled('conv-1', true);
            await new Promise(resolve => setImmediate(resolve));

            expect(mockChatbotAIService.deleteSession).not.toHaveBeenCalled();
        });

        it('does NOT delete the AI session when manually handing off to an operator', async () => {
            const conversation = { id: 'conv-1', botEnabled: true };

            mockConversationRepository.findOneById.mockResolvedValue(
                conversation
            );
            mockConversationRepository.updateEntity.mockResolvedValue({
                ...conversation,
                botEnabled: false,
            });

            await service.setBotEnabled('conv-1', false, 'Handling VIP myself');
            await new Promise(resolve => setImmediate(resolve));

            expect(mockChatbotAIService.deleteSession).not.toHaveBeenCalled();
        });
    });

    describe('triggerHandoff', () => {
        it('should turn the bot off, stamp handoffAt, and notify operators', async () => {
            const conversation = { id: 'conv-1', botEnabled: true };

            mockConversationRepository.updateEntity.mockResolvedValue({
                ...conversation,
                botEnabled: false,
                handoffAt: new Date(),
                handoffReason: 'fallback_threshold',
            });
            mockWorkspaceMemberRepository.findActiveByWorkspace.mockResolvedValue(
                [{ user: { id: 'user-1' } }]
            );
            mockNotificationService.create.mockResolvedValue({});

            await service.triggerHandoff(
                conversation as any,
                'workspace-1',
                'fallback_threshold'
            );

            const [, patch] =
                mockConversationRepository.updateEntity.mock.calls[0];
            expect(patch.botEnabled).toBe(false);
            expect(patch.handoffAt).toBeInstanceOf(Date);
            expect(mockNotificationService.create).toHaveBeenCalledTimes(1);
        });
    });

    describe('detectHandoffKeywords', () => {
        it('should detect default handoff keywords in message', () => {
            expect(
                service.detectHandoffKeywords('I want to speak to a human', [])
            ).toBe(true);
            expect(
                service.detectHandoffKeywords('connect me to an agent', [])
            ).toBe(true);
            expect(
                service.detectHandoffKeywords('I need customer service', [])
            ).toBe(true);
        });

        it('should detect custom keywords', () => {
            expect(
                service.detectHandoffKeywords('I want to escalate this issue', [
                    'escalate',
                ])
            ).toBe(true);
        });

        it('should return false for normal messages', () => {
            expect(
                service.detectHandoffKeywords('What are your store hours?', [])
            ).toBe(false);
            expect(
                service.detectHandoffKeywords('Track my order please', [])
            ).toBe(false);
        });

        it('should be case insensitive', () => {
            expect(service.detectHandoffKeywords('I WANT A HUMAN', [])).toBe(
                true
            );
            expect(
                service.detectHandoffKeywords('Get me an AGENT please', [])
            ).toBe(true);
        });

        it('should return false for empty message', () => {
            expect(service.detectHandoffKeywords('', [])).toBe(false);
        });
    });

    describe('updateStatus', () => {
        it('should set resolvedAt and reset to a clean slate when resolving', async () => {
            const conversation = {
                id: 'conv-1',
                status: ENUM_CONVERSATION_STATUS.OPEN,
                botEnabled: false,
            };

            mockConversationRepository.findOneById.mockResolvedValue(
                conversation
            );
            mockConversationRepository.updateEntity.mockResolvedValue({
                ...conversation,
                status: ENUM_CONVERSATION_STATUS.RESOLVED,
                resolvedAt: new Date(),
                botEnabled: true,
            });

            const result = await service.updateStatus(
                'conv-1',
                ENUM_CONVERSATION_STATUS.RESOLVED
            );

            expect(
                mockConversationRepository.updateEntity
            ).toHaveBeenCalledWith(
                { id: 'conv-1' },
                expect.objectContaining({
                    status: ENUM_CONVERSATION_STATUS.RESOLVED,
                    botEnabled: true,
                    handoffAt: null,
                    handoffReason: null,
                    fallbackCount: 0,
                })
            );
            expect(result.status).toBe(ENUM_CONVERSATION_STATUS.RESOLVED);
        });

        it('should clear resolvedAt and re-enable the bot when reopening', async () => {
            const conversation = {
                id: 'conv-1',
                status: ENUM_CONVERSATION_STATUS.RESOLVED,
                botEnabled: true,
            };

            mockConversationRepository.findOneById.mockResolvedValue(
                conversation
            );
            mockConversationRepository.updateEntity.mockResolvedValue({
                ...conversation,
                status: ENUM_CONVERSATION_STATUS.OPEN,
                resolvedAt: null,
            });

            await service.updateStatus('conv-1', ENUM_CONVERSATION_STATUS.OPEN);

            expect(
                mockConversationRepository.updateEntity
            ).toHaveBeenCalledWith(
                { id: 'conv-1' },
                expect.objectContaining({
                    status: ENUM_CONVERSATION_STATUS.OPEN,
                    resolvedAt: null,
                    botEnabled: true,
                    fallbackCount: 0,
                })
            );
        });

        it('should delete the AI session on any lifecycle change', async () => {
            const conversation = {
                id: 'conv-1',
                status: ENUM_CONVERSATION_STATUS.OPEN,
                botEnabled: true,
            };

            mockConversationRepository.findOneById.mockResolvedValue(
                conversation
            );
            mockConversationRepository.updateEntity.mockResolvedValue({
                ...conversation,
                status: ENUM_CONVERSATION_STATUS.RESOLVED,
            });

            await service.updateStatus(
                'conv-1',
                ENUM_CONVERSATION_STATUS.RESOLVED
            );

            // Allow the fire-and-forget deleteSession to settle
            await new Promise(resolve => setImmediate(resolve));

            expect(mockChatbotAIService.deleteSession).toHaveBeenCalledWith(
                'conv-1'
            );
        });

        it('should still return the updated conversation when AI session deletion fails', async () => {
            const conversation = {
                id: 'conv-1',
                status: ENUM_CONVERSATION_STATUS.OPEN,
            };
            const updated = {
                ...conversation,
                status: ENUM_CONVERSATION_STATUS.RESOLVED,
            };

            mockConversationRepository.findOneById.mockResolvedValue(
                conversation
            );
            mockConversationRepository.updateEntity.mockResolvedValue(updated);
            mockChatbotAIService.deleteSession.mockRejectedValue(
                new Error('AI backend unreachable')
            );

            const result = await service.updateStatus(
                'conv-1',
                ENUM_CONVERSATION_STATUS.RESOLVED
            );
            await new Promise(resolve => setImmediate(resolve));

            expect(result).toEqual(updated);
        });

        it('should throw NotFoundException when conversation not found', async () => {
            mockConversationRepository.findOneById.mockResolvedValue(null);

            await expect(
                service.updateStatus(
                    'conv-nonexistent',
                    ENUM_CONVERSATION_STATUS.RESOLVED
                )
            ).rejects.toThrow();
        });
    });

    describe('recordFallback', () => {
        it('should increment fallback count and trigger when threshold reached', async () => {
            const conversation = {
                id: 'conv-1',
                fallbackCount: 2,
                status: ENUM_CONVERSATION_STATUS.OPEN,
            };

            mockConversationRepository.findByChatbotAccountSender.mockResolvedValue(
                conversation
            );
            mockConversationRepository.create.mockResolvedValue(conversation);
            mockConversationRepository.updateEntity.mockResolvedValue({
                ...conversation,
                fallbackCount: 3,
            });

            const { triggered, conversation: conv } =
                await service.recordFallback(
                    'chatbot-1',
                    'account-1',
                    'sender-1',
                    3 // threshold
                );

            expect(triggered).toBe(true);
            expect(conv.fallbackCount).toBe(3);
        });

        it('should not trigger when below threshold', async () => {
            const conversation = {
                id: 'conv-1',
                fallbackCount: 1,
                status: ENUM_CONVERSATION_STATUS.OPEN,
            };

            mockConversationRepository.findByChatbotAccountSender.mockResolvedValue(
                conversation
            );
            mockConversationRepository.updateEntity.mockResolvedValue({
                ...conversation,
                fallbackCount: 2,
            });

            const { triggered } = await service.recordFallback(
                'chatbot-1',
                'account-1',
                'sender-1',
                3 // threshold
            );

            expect(triggered).toBe(false);
        });
    });

    describe('notifyOperators', () => {
        it('should create notifications for all active workspace members', async () => {
            const members = [
                { user: { id: 'user-1' } },
                { user: { id: 'user-2' } },
            ];

            mockWorkspaceMemberRepository.findActiveByWorkspace.mockResolvedValue(
                members
            );
            mockNotificationService.create.mockResolvedValue({});

            await service.notifyOperators(
                'conv-1',
                'workspace-1',
                'Customer requested human',
                'Connecting you with an agent'
            );

            expect(
                mockWorkspaceMemberRepository.findActiveByWorkspace
            ).toHaveBeenCalledWith('workspace-1');
            expect(mockNotificationService.create).toHaveBeenCalledTimes(2);
            expect(mockNotificationService.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    recipient: 'user-1',
                })
            );
        });

        it('should handle case with no workspace members gracefully', async () => {
            mockWorkspaceMemberRepository.findActiveByWorkspace.mockResolvedValue(
                []
            );
            mockNotificationService.create.mockResolvedValue({});

            await service.notifyOperators(
                'conv-1',
                'workspace-1',
                'Test reason'
            );

            expect(mockNotificationService.create).not.toHaveBeenCalled();
        });
    });

    describe('mapGet', () => {
        it('should transform a ConversationEntity to ConversationGetResponseDto', () => {
            const entity = {
                id: 'conv-1',
                senderId: 'sender-1',
                status: ENUM_CONVERSATION_STATUS.OPEN,
                fallbackCount: 0,
                handoffAt: null,
                resolvedAt: null,
                lastMessageAt: new Date(),
                handoffReason: null,
            };

            const result = service.mapGet(entity as any);
            expect(result).toBeDefined();
        });
    });

    describe('mapList', () => {
        it('should transform an array of ConversationEntity to ConversationGetResponseDto[]', () => {
            const entities = [
                {
                    id: 'conv-1',
                    senderId: 'sender-1',
                    status: ENUM_CONVERSATION_STATUS.OPEN,
                    fallbackCount: 0,
                },
                {
                    id: 'conv-2',
                    senderId: 'sender-2',
                    status: ENUM_CONVERSATION_STATUS.OPEN,
                    botEnabled: false,
                    fallbackCount: 3,
                },
            ];

            const result = service.mapList(entities as any);
            expect(result).toHaveLength(2);
        });

        it('should return empty array for empty input', () => {
            const result = service.mapList([]);
            expect(result).toHaveLength(0);
        });

        const buildConversation = (id: string) =>
            ({
                id,
                senderId: 's',
                status: ENUM_CONVERSATION_STATUS.OPEN,
                botEnabled: true,
                fallbackCount: 0,
                handoffAt: null,
                resolvedAt: null,
                lastMessageAt: new Date(),
                handoffReason: null,
                chatbot: { id: 'cb' },
            }) as any;

        it('attaches unreadCount from the map', () => {
            const dtos = service.mapList(
                [buildConversation('c1'), buildConversation('c2')],
                new Map([
                    ['c1', 5],
                    ['c2', 0],
                ])
            );
            expect(dtos[0].unreadCount).toBe(5);
            expect(dtos[1].unreadCount).toBe(0);
        });

        it('defaults to 0 when conversation id is not in the map', () => {
            const dtos = service.mapList(
                [buildConversation('c3')],
                new Map([['c1', 5]])
            );
            expect(dtos[0].unreadCount).toBe(0);
        });

        it('defaults to 0 when unreadCounts is not provided', () => {
            const dtos = service.mapList([buildConversation('c1')]);
            expect(dtos[0].unreadCount).toBe(0);
        });
    });
});
