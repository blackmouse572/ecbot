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
        createHandoff: jest.fn(),
        createTagNotice: jest.fn(),
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

    const mockMessageRepository = {
        create: jest.fn().mockResolvedValue(undefined),
        findNewest: jest.fn().mockResolvedValue([]),
    };

    const mockActivityService = {
        createByBotWithWorkspace: jest.fn().mockResolvedValue(undefined),
    };

    // What the bot reads in its history once staff hand a conversation back.
    const handledNote = () =>
        expect.objectContaining({
            conversation: { id: 'conv-1' },
            direction: 'OUTBOUND',
            authorType: 'SYSTEM',
            text: expect.stringContaining('[Handled by staff]'),
        });

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
                        mockModuleRef as any,
                        mockMessageRepository as any,
                        mockActivityService as any
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

    describe('setTimezone', () => {
        it('writes the timezone, null included', async () => {
            mockConversationRepository.updateEntity.mockResolvedValue({
                id: 'conv-1',
            });

            await service.setTimezone('conv-1', 'America/New_York');
            await service.setTimezone('conv-1', null);

            expect(mockConversationRepository.updateEntity.mock.calls).toEqual([
                [{ id: 'conv-1' }, { timezone: 'America/New_York' }],
                [{ id: 'conv-1' }, { timezone: null }],
            ]);
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

        it('leaves a handled note for the bot when staff switch it back on', async () => {
            const conversation = { id: 'conv-1', botEnabled: false };
            mockConversationRepository.findOneById.mockResolvedValue(
                conversation
            );
            // The ORM updates the loaded entity in place.
            mockConversationRepository.updateEntity.mockImplementation(
                async (_find, patch) => Object.assign(conversation, patch)
            );

            await service.setBotEnabled('conv-1', true);

            expect(mockMessageRepository.create).toHaveBeenCalledWith(
                handledNote()
            );
        });

        it('leaves no note when the bot was already on or is switched off', async () => {
            mockConversationRepository.findOneById.mockResolvedValue({
                id: 'conv-1',
                botEnabled: true,
            });
            mockConversationRepository.updateEntity.mockResolvedValue({
                id: 'conv-1',
            });

            await service.setBotEnabled('conv-1', true);
            await service.setBotEnabled('conv-1', false);

            expect(mockMessageRepository.create).not.toHaveBeenCalled();
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
                [{ user: { id: 'user-1' }, workspace: { slug: 'acme' } }]
            );
            mockNotificationService.createHandoff.mockResolvedValue({});

            await service.triggerHandoff(
                conversation as any,
                'workspace-1',
                'fallback_threshold',
                'vi'
            );

            const [, patch] =
                mockConversationRepository.updateEntity.mock.calls[0];
            expect(patch.botEnabled).toBe(false);
            expect(patch.handoffAt).toBeInstanceOf(Date);
            expect(mockNotificationService.createHandoff).toHaveBeenCalledTimes(
                1
            );
            expect(mockNotificationService.createHandoff).toHaveBeenCalledWith(
                'user-1',
                expect.objectContaining({ language: 'vi' })
            );
        });

        it('also emails the team about the handoff', async () => {
            const send = jest.fn().mockResolvedValue(undefined);
            mockModuleRef.get.mockReturnValue({ send });
            mockConversationRepository.updateEntity.mockResolvedValue({
                id: 'conv-1',
            });
            mockWorkspaceMemberRepository.findActiveByWorkspace.mockResolvedValue(
                []
            );

            await service.triggerHandoff(
                { id: 'conv-1' } as any,
                'workspace-1',
                'keyword_trigger',
                'vi'
            );

            expect(send).toHaveBeenCalledWith(
                'conv-1',
                'workspace-1',
                'keyword_trigger',
                'vi'
            );
            mockModuleRef.get.mockReset();
        });

        // The dashboard's handoff rate counts these rows: the conversation's
        // own handoff fields are cleared once staff resolve it.
        it('logs the handoff in the activity log as done by the bot', async () => {
            mockConversationRepository.updateEntity.mockResolvedValue({
                id: 'conv-1',
            });
            mockWorkspaceMemberRepository.findActiveByWorkspace.mockResolvedValue(
                []
            );

            await service.triggerHandoff(
                { id: 'conv-1', senderName: 'Lan' } as any,
                'workspace-1',
                'tag_trigger',
                'vi',
                'tag-1'
            );

            expect(
                mockActivityService.createByBotWithWorkspace
            ).toHaveBeenCalledWith('workspace-1', {
                action: 'conversation_handoff',
                subject: 'CONVERSATION',
                metadata: {
                    id: 'conv-1',
                    name: 'Lan',
                    reason: 'tag_trigger',
                    tagId: 'tag-1',
                },
            });
        });

        it('still hands over when the activity log write fails', async () => {
            mockConversationRepository.updateEntity.mockResolvedValue({
                id: 'conv-1',
            });
            mockWorkspaceMemberRepository.findActiveByWorkspace.mockResolvedValue(
                []
            );
            mockActivityService.createByBotWithWorkspace.mockRejectedValueOnce(
                new Error('db down')
            );

            await expect(
                service.triggerHandoff(
                    { id: 'conv-1' } as any,
                    'workspace-1',
                    'keyword_trigger'
                )
            ).resolves.toEqual({ id: 'conv-1' });
        });
    });

    // Returns the keyword that matched and where it came from: only the
    // default list is checked with the decision model, an owner's own keyword
    // (a topic they route to staff) always hands off.
    describe('detectHandoffKeywords', () => {
        it('returns a default keyword that matched', () => {
            expect(
                service.detectHandoffKeywords('I want to speak to a human', [])
            ).toEqual({ keyword: 'human', source: 'default' });
            expect(
                service.detectHandoffKeywords('I need customer service', [])
            ).toEqual({ keyword: 'customer service', source: 'default' });
        });

        it("returns the owner's keyword as custom", () => {
            expect(
                service.detectHandoffKeywords('Mình muốn đổi trả đơn hôm qua', [
                    'đổi trả',
                ])
            ).toEqual({ keyword: 'đổi trả', source: 'custom' });
        });

        it("prefers the owner's keyword when both match", () => {
            expect(
                service.detectHandoffKeywords(
                    'Nhân viên ơi, mình muốn khiếu nại',
                    ['khiếu nại']
                )
            ).toEqual({ keyword: 'khiếu nại', source: 'custom' });
        });

        it('returns null for a message with no keyword', () => {
            expect(
                service.detectHandoffKeywords('What are your store hours?', [])
            ).toBeNull();
        });

        it('matches case-insensitively', () => {
            expect(service.detectHandoffKeywords('I WANT A HUMAN', [])).toEqual(
                { keyword: 'human', source: 'default' }
            );
        });

        it('returns null for an empty message', () => {
            expect(service.detectHandoffKeywords('', [])).toBeNull();
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

        it('leaves a handled note for the bot when resolving', async () => {
            mockConversationRepository.findOneById.mockResolvedValue({
                id: 'conv-1',
                status: ENUM_CONVERSATION_STATUS.OPEN,
            });
            mockConversationRepository.updateEntity.mockResolvedValue({
                id: 'conv-1',
                status: ENUM_CONVERSATION_STATUS.RESOLVED,
            });

            await service.updateStatus(
                'conv-1',
                ENUM_CONVERSATION_STATUS.RESOLVED
            );

            expect(mockMessageRepository.create).toHaveBeenCalledWith(
                handledNote()
            );
        });

        it('leaves one note when staff switch the bot on and then resolve', async () => {
            mockConversationRepository.findOneById.mockResolvedValue({
                id: 'conv-1',
                status: ENUM_CONVERSATION_STATUS.OPEN,
            });
            mockConversationRepository.updateEntity.mockResolvedValue({
                id: 'conv-1',
            });
            mockMessageRepository.findNewest.mockResolvedValueOnce([
                { authorType: 'SYSTEM' },
            ]);

            await service.updateStatus(
                'conv-1',
                ENUM_CONVERSATION_STATUS.RESOLVED
            );

            expect(mockMessageRepository.findNewest).toHaveBeenCalledWith(
                { conversation: 'conv-1', deletedAt: null },
                1
            );
            expect(mockMessageRepository.create).not.toHaveBeenCalled();
        });

        it('leaves no note when reopening', async () => {
            mockConversationRepository.findOneById.mockResolvedValue({
                id: 'conv-1',
                status: ENUM_CONVERSATION_STATUS.RESOLVED,
            });
            mockConversationRepository.updateEntity.mockResolvedValue({
                id: 'conv-1',
                status: ENUM_CONVERSATION_STATUS.OPEN,
            });

            await service.updateStatus('conv-1', ENUM_CONVERSATION_STATUS.OPEN);

            expect(mockMessageRepository.create).not.toHaveBeenCalled();
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

    // #288: tell the team about a tagged customer without a handoff.
    describe('notifyTeam', () => {
        it('notifies every member and emails the team, leaving the bot on', async () => {
            const send = jest.fn().mockResolvedValue(undefined);
            mockModuleRef.get.mockReturnValue({ send });
            mockWorkspaceMemberRepository.findActiveByWorkspace.mockResolvedValue(
                [
                    { user: { id: 'user-1' }, workspace: { slug: 'acme' } },
                    { user: { id: 'user-2' }, workspace: { slug: 'acme' } },
                ]
            );
            mockNotificationService.createTagNotice.mockResolvedValue({});

            await service.notifyTeam(
                { id: 'conv-1' } as any,
                'workspace-1',
                'Order placed',
                'vi'
            );

            expect(
                mockConversationRepository.updateEntity
            ).not.toHaveBeenCalled();
            expect(
                mockNotificationService.createTagNotice
            ).toHaveBeenCalledTimes(2);
            expect(
                mockNotificationService.createTagNotice
            ).toHaveBeenCalledWith('user-1', {
                conversationId: 'conv-1',
                workspaceId: 'workspace-1',
                workspaceSlug: 'acme',
                tagName: 'Order placed',
                language: 'vi',
            });
            expect(send).toHaveBeenCalledWith(
                'conv-1',
                'workspace-1',
                'tag_notice',
                'vi',
                'Order placed'
            );
            mockModuleRef.get.mockReset();
        });
    });

    describe('notifyOperators', () => {
        it('should create notifications for all active workspace members', async () => {
            const members = [
                { user: { id: 'user-1' }, workspace: { slug: 'acme' } },
                { user: { id: 'user-2' }, workspace: { slug: 'acme' } },
            ];

            mockWorkspaceMemberRepository.findActiveByWorkspace.mockResolvedValue(
                members
            );
            mockNotificationService.createHandoff.mockResolvedValue({});

            await service.notifyOperators(
                'conv-1',
                'workspace-1',
                'keyword_trigger'
            );

            expect(
                mockWorkspaceMemberRepository.findActiveByWorkspace
            ).toHaveBeenCalledWith('workspace-1');
            expect(mockNotificationService.createHandoff).toHaveBeenCalledTimes(
                2
            );
            expect(mockNotificationService.createHandoff).toHaveBeenCalledWith(
                'user-1',
                {
                    conversationId: 'conv-1',
                    workspaceId: 'workspace-1',
                    workspaceSlug: 'acme',
                    reason: 'keyword_trigger',
                }
            );
        });

        it('should handle case with no workspace members gracefully', async () => {
            mockWorkspaceMemberRepository.findActiveByWorkspace.mockResolvedValue(
                []
            );
            await service.notifyOperators(
                'conv-1',
                'workspace-1',
                'Test reason'
            );

            expect(
                mockNotificationService.createHandoff
            ).not.toHaveBeenCalled();
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
