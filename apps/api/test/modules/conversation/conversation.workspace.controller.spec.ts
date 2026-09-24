import { NotFoundException } from '@nestjs/common';
import { ConversationWorkspaceController } from '../../../src/modules/conversation/controllers/conversation.workspace.controller';
import { ENUM_CONVERSATION_STATUS } from '../../../src/modules/conversation/enums/conversation.enum';
import { ENUM_ACCOUNT_TYPE } from '../../../src/modules/account/enums/account.enum';
import { WorkspaceEntity } from '../../../src/modules/workspace/repository/entities/workspace.entity';
import { ConversationGetResponseDto } from '../../../src/modules/conversation/dtos/response/conversation.get.response.dto';

const mockConversationService = {
    findByWorkspace: jest.fn(),
    countByWorkspace: jest.fn(),
    findOneById: jest.fn(),
    findOneByIdInWorkspace: jest.fn(),
    updateStatus: jest.fn(),
    setBotEnabled: jest.fn(),
    notifyOperators: jest.fn(),
    mapGet: jest.fn(),
    mapList: jest.fn(),
    getUnreadCounts: jest.fn(),
    markConversationRead: jest.fn(),
};

const mockPaginationService = {
    totalPage: jest.fn(),
};

const mockConversationMessagingService = {
    listMessages: jest.fn(),
    mapMessages: jest.fn(),
    sendOperatorReply: jest.fn(),
    reactToMessage: jest.fn(),
    mapMessage: jest.fn(),
    buildUserNameMap: jest.fn(),
    listToolInvocations: jest.fn(),
};

const mockActivityService = {
    createByUserWithWorkspace: jest.fn(),
};

function buildController(): ConversationWorkspaceController {
    return new ConversationWorkspaceController(
        mockConversationService as any,
        mockPaginationService as any,
        mockConversationMessagingService as any,
        mockActivityService as any
    );
}

const workspaceId = 'workspace-id-1';
const workspace = { id: workspaceId } as WorkspaceEntity;
const operatorId = 'operator-id-1';
const user = { id: operatorId, email: 'op@acme.test' } as any;

const basePagination = {
    _search: {},
    _limit: 20,
    _offset: 0,
    _order: {},
    _availableOrderBy: [],
    _availableOrderDirection: [],
};

const mockConversation = {
    id: 'conv-1',
    senderId: 'sender-1',
    status: ENUM_CONVERSATION_STATUS.OPEN,
    botEnabled: true,
    fallbackCount: 0,
    handoffAt: null,
    resolvedAt: null,
    lastMessageAt: new Date(),
    handoffReason: null,
    chatbot: { id: 'chatbot-1' },
    account: {
        id: 'account-1',
        type: ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE,
        name: 'Test Page',
        slug: 'test-page',
        link: 'https://fb.com/test-page',
        status: 'ACTIVE',
        workspace: workspaceId,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
};

const mockMappedConversation: ConversationGetResponseDto = {
    id: 'conv-1',
    senderId: 'sender-1',
    status: ENUM_CONVERSATION_STATUS.OPEN,
    botEnabled: true,
    fallbackCount: 0,
    createdAt: new Date(),
    canReact: false,
};

describe('ConversationWorkspaceController', () => {
    let controller: ConversationWorkspaceController;

    beforeEach(() => {
        jest.clearAllMocks();
        controller = buildController();
        mockConversationService.mapList.mockReturnValue([
            mockMappedConversation,
        ]);
        mockConversationService.mapGet.mockReturnValue(mockMappedConversation);
        mockPaginationService.totalPage.mockReturnValue(1);
        mockConversationService.getUnreadCounts.mockResolvedValue(new Map());
    });

    describe('list', () => {
        it('should return paginated conversations with default (empty) filters', async () => {
            mockConversationService.findByWorkspace.mockResolvedValue([
                mockConversation,
            ]);
            mockConversationService.countByWorkspace.mockResolvedValue(1);

            const result = await controller.list(
                workspace,
                operatorId,
                basePagination as any,
                {},
                {},
                {},
                {},
                {}
            );

            expect(
                mockConversationService.findByWorkspace
            ).toHaveBeenCalledWith(
                workspaceId,
                {},
                {
                    paging: { limit: 20, offset: 0 },
                    order: {},
                }
            );
            expect(
                mockConversationService.countByWorkspace
            ).toHaveBeenCalledWith(workspaceId, {});
            expect(mockPaginationService.totalPage).toHaveBeenCalledWith(1, 20);
            expect(result).toEqual({
                _pagination: { total: 1, totalPage: 1 },
                data: [mockMappedConversation],
            });
        });

        it('should pass status filter to service when provided', async () => {
            // The pipe transforms '?status=RESOLVED' into this object
            const statusFilter = {
                status: { $in: [ENUM_CONVERSATION_STATUS.RESOLVED] },
            };

            mockConversationService.findByWorkspace.mockResolvedValue([]);
            mockConversationService.countByWorkspace.mockResolvedValue(0);

            await controller.list(
                workspace,
                operatorId,
                basePagination as any,
                statusFilter,
                {},
                {},
                {},
                {}
            );

            expect(
                mockConversationService.findByWorkspace
            ).toHaveBeenCalledWith(
                workspaceId,
                expect.objectContaining(statusFilter),
                expect.anything()
            );
            expect(
                mockConversationService.countByWorkspace
            ).toHaveBeenCalledWith(
                workspaceId,
                expect.objectContaining(statusFilter)
            );
        });

        it('should pass account type filter to service when provided', async () => {
            // The pipe transforms '?accountType=FACEBOOK_PAGE' into this object
            const accountTypeFilter = {
                'account.type': {
                    $in: [ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE],
                },
            };

            mockConversationService.findByWorkspace.mockResolvedValue([]);
            mockConversationService.countByWorkspace.mockResolvedValue(0);

            await controller.list(
                workspace,
                operatorId,
                basePagination as any,
                {},
                accountTypeFilter,
                {},
                {},
                {}
            );

            expect(
                mockConversationService.findByWorkspace
            ).toHaveBeenCalledWith(
                workspaceId,
                expect.objectContaining(accountTypeFilter),
                expect.anything()
            );
            expect(
                mockConversationService.countByWorkspace
            ).toHaveBeenCalledWith(
                workspaceId,
                expect.objectContaining(accountTypeFilter)
            );
        });

        it('should pass account id filter to service when provided', async () => {
            // The pipe transforms '?account=account-1' into this object
            const accountFilter = {
                'account.id': { $eq: 'account-1' },
            };

            mockConversationService.findByWorkspace.mockResolvedValue([]);
            mockConversationService.countByWorkspace.mockResolvedValue(0);

            await controller.list(
                workspace,
                operatorId,
                basePagination as any,
                {},
                {},
                accountFilter,
                {},
                {}
            );

            expect(
                mockConversationService.findByWorkspace
            ).toHaveBeenCalledWith(
                workspaceId,
                expect.objectContaining(accountFilter),
                expect.anything()
            );
            expect(
                mockConversationService.countByWorkspace
            ).toHaveBeenCalledWith(
                workspaceId,
                expect.objectContaining(accountFilter)
            );
        });

        it('should merge all filters together into a single find object', async () => {
            const statusFilter = {
                status: { $in: [ENUM_CONVERSATION_STATUS.RESOLVED] },
            };
            const accountTypeFilter = {
                'account.type': { $in: [ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE] },
            };
            const accountFilter = {
                'account.id': { $eq: 'account-1' },
            };

            mockConversationService.findByWorkspace.mockResolvedValue([]);
            mockConversationService.countByWorkspace.mockResolvedValue(0);

            await controller.list(
                workspace,
                operatorId,
                basePagination as any,
                statusFilter,
                accountTypeFilter,
                accountFilter,
                {},
                {}
            );

            const expectedFind = {
                ...statusFilter,
                ...accountTypeFilter,
                ...accountFilter,
            };

            expect(
                mockConversationService.findByWorkspace
            ).toHaveBeenCalledWith(
                workspaceId,
                expect.objectContaining(expectedFind),
                expect.anything()
            );
            expect(
                mockConversationService.countByWorkspace
            ).toHaveBeenCalledWith(
                workspaceId,
                expect.objectContaining(expectedFind)
            );
        });

        it('should merge search filter into the find object', async () => {
            const paginationWithSearch = {
                ...basePagination,
                _search: { senderId: { $ilike: '%sender%' } },
            };

            mockConversationService.findByWorkspace.mockResolvedValue([]);
            mockConversationService.countByWorkspace.mockResolvedValue(0);

            await controller.list(
                workspace,
                operatorId,
                paginationWithSearch as any,
                {},
                {},
                {},
                {},
                {}
            );

            expect(
                mockConversationService.findByWorkspace
            ).toHaveBeenCalledWith(
                workspaceId,
                expect.objectContaining(paginationWithSearch._search),
                expect.anything()
            );
        });

        it('should forward _limit and _offset to service as paging options', async () => {
            const paginationWithOffset = {
                ...basePagination,
                _limit: 10,
                _offset: 20,
            };

            mockConversationService.findByWorkspace.mockResolvedValue([]);
            mockConversationService.countByWorkspace.mockResolvedValue(0);

            await controller.list(
                workspace,
                operatorId,
                paginationWithOffset as any,
                {},
                {},
                {},
                {},
                {}
            );

            expect(
                mockConversationService.findByWorkspace
            ).toHaveBeenCalledWith(
                workspaceId,
                {},
                {
                    paging: { limit: 10, offset: 20 },
                    order: {},
                }
            );
            expect(mockPaginationService.totalPage).toHaveBeenCalledWith(0, 10);
        });

        it('should return correct pagination metadata', async () => {
            mockConversationService.findByWorkspace.mockResolvedValue([
                mockConversation,
                mockConversation,
            ]);
            mockConversationService.countByWorkspace.mockResolvedValue(50);
            mockPaginationService.totalPage.mockReturnValue(3);

            const result = await controller.list(
                workspace,
                operatorId,
                { ...basePagination, _limit: 20 } as any,
                {},
                {},
                {},
                {},
                {}
            );

            expect(result._pagination).toEqual({ total: 50, totalPage: 3 });
        });

        it('should call mapList with conversations and unread counts from service', async () => {
            const conversations = [
                mockConversation,
                { ...mockConversation, id: 'conv-2' },
            ];
            const unreadCounts = new Map([['conv-1', 3]]);
            mockConversationService.findByWorkspace.mockResolvedValue(
                conversations
            );
            mockConversationService.countByWorkspace.mockResolvedValue(2);
            mockConversationService.getUnreadCounts.mockResolvedValue(
                unreadCounts
            );
            mockConversationService.mapList.mockReturnValue([
                mockMappedConversation,
                { ...mockMappedConversation, id: 'conv-2' },
            ]);

            const result = await controller.list(
                workspace,
                operatorId,
                basePagination as any,
                {},
                {},
                {},
                {},
                {}
            );

            expect(
                mockConversationService.getUnreadCounts
            ).toHaveBeenCalledWith(
                operatorId,
                ['conv-1', 'conv-2'],
                workspace.id
            );
            expect(mockConversationService.mapList).toHaveBeenCalledWith(
                conversations,
                unreadCounts
            );
            expect(result.data).toHaveLength(2);
        });
    });

    describe('listMessages', () => {
        it('reports the real conversation total, not the page size', async () => {
            const pageMessages = [
                { id: 'msg-1', dateSent: new Date('2026-01-01') },
                { id: 'msg-2', dateSent: new Date('2026-01-02') },
            ];
            mockConversationMessagingService.listMessages.mockResolvedValue({
                messages: pageMessages,
                conversation: mockConversation,
                total: 137,
            });
            mockConversationMessagingService.buildUserNameMap.mockResolvedValue(
                new Map()
            );
            mockConversationMessagingService.listToolInvocations.mockResolvedValue(
                []
            );
            mockConversationMessagingService.mapMessages.mockReturnValue([]);
            mockPaginationService.totalPage.mockReturnValue(3);

            const result = await controller.listMessages(
                workspace,
                'conv-1',
                1,
                50
            );

            expect(
                mockConversationMessagingService.listMessages
            ).toHaveBeenCalledWith('conv-1', workspaceId, {
                limit: 50,
                offset: 0,
            });
            expect(result._pagination.total).toBe(137);
            expect(mockPaginationService.totalPage).toHaveBeenCalledWith(
                137,
                50
            );
            expect(result._pagination.totalPage).toBe(3);
        });

        it('propagates the 404 thrown by the messaging service for a cross-workspace id', async () => {
            mockConversationMessagingService.listMessages.mockRejectedValue(
                new NotFoundException({
                    message: 'conversation.error.notFound',
                    statusCode: 404,
                })
            );

            await expect(
                controller.listMessages(workspace, 'conv-other-workspace', 1, 50)
            ).rejects.toBeInstanceOf(NotFoundException);
        });
    });

    describe('get', () => {
        it('should return mapped conversation when found', async () => {
            mockConversationService.findOneByIdInWorkspace.mockResolvedValue(
                mockConversation
            );

            const result = await controller.get(workspace, 'conv-1');

            // The detail endpoint also populates contactPoint + its customer so
            // mapGet can surface customerId without risking ReferenceNotInitializedError.
            expect(
                mockConversationService.findOneByIdInWorkspace
            ).toHaveBeenCalledWith('conv-1', workspaceId, {
                populate: [
                    'account',
                    'chatbot',
                    'contactPoint',
                    'contactPoint.customer',
                ],
            });
            expect(mockConversationService.mapGet).toHaveBeenCalledWith(
                mockConversation
            );
            expect(result).toEqual({ data: mockMappedConversation });
        });

        it('should throw NotFoundException when conversation does not exist', async () => {
            mockConversationService.findOneByIdInWorkspace.mockResolvedValue(
                null
            );

            await expect(
                controller.get(workspace, 'nonexistent-id')
            ).rejects.toThrow(NotFoundException);
        });

        it('should throw NotFoundException (same as non-existent) when conversation belongs to another workspace', async () => {
            mockConversationService.findOneByIdInWorkspace.mockResolvedValue(
                null
            );

            await expect(
                controller.get(workspace, 'conv-in-other-workspace')
            ).rejects.toThrow(NotFoundException);

            expect(
                mockConversationService.findOneByIdInWorkspace
            ).toHaveBeenCalledWith(
                'conv-in-other-workspace',
                workspaceId,
                expect.anything()
            );
        });
    });

    describe('markRead', () => {
        const conversationId = 'conv-1';

        it('throws 404 when conversation is not in caller workspace', async () => {
            mockConversationService.findOneByIdInWorkspace.mockResolvedValue(
                null
            );
            const controllerLocal = buildController();

            await expect(
                controllerLocal.markRead(workspace, conversationId, user)
            ).rejects.toBeInstanceOf(NotFoundException);

            expect(
                mockConversationService.findOneByIdInWorkspace
            ).toHaveBeenCalledWith(conversationId, workspaceId);
            expect(
                mockConversationService.markConversationRead
            ).not.toHaveBeenCalled();
        });

        it('upserts read state when conversation is in caller workspace', async () => {
            mockConversationService.findOneByIdInWorkspace.mockResolvedValue(
                mockConversation
            );
            mockConversationService.markConversationRead.mockResolvedValue(
                undefined
            );
            const controllerLocal = buildController();

            await controllerLocal.markRead(workspace, conversationId, user);

            expect(
                mockConversationService.markConversationRead
            ).toHaveBeenCalledWith(operatorId, conversationId);
        });
    });

    describe('updateStatus', () => {
        it('should update lifecycle status and return mapped result', async () => {
            const dto = {
                status: ENUM_CONVERSATION_STATUS.RESOLVED,
                reason: 'Issue resolved',
            };
            const updated = {
                ...mockConversation,
                status: ENUM_CONVERSATION_STATUS.RESOLVED,
            };

            mockConversationService.findOneByIdInWorkspace.mockResolvedValue(
                mockConversation
            );
            mockConversationService.updateStatus.mockResolvedValue(updated);

            const result = await controller.updateStatus(
                workspace,
                'conv-1',
                dto as any,
                user
            );

            expect(
                mockConversationService.findOneByIdInWorkspace
            ).toHaveBeenCalledWith('conv-1', workspaceId);
            expect(mockConversationService.updateStatus).toHaveBeenCalledWith(
                'conv-1',
                ENUM_CONVERSATION_STATUS.RESOLVED,
                'Issue resolved'
            );
            expect(result).toEqual({ data: mockMappedConversation });
        });

        it('should not notify operators on a lifecycle change', async () => {
            const dto = { status: ENUM_CONVERSATION_STATUS.RESOLVED };

            mockConversationService.findOneByIdInWorkspace.mockResolvedValue(
                mockConversation
            );
            mockConversationService.updateStatus.mockResolvedValue(
                mockConversation
            );

            await controller.updateStatus(
                workspace,
                'conv-1',
                dto as any,
                user
            );

            expect(
                mockConversationService.notifyOperators
            ).not.toHaveBeenCalled();
        });

        it('should throw NotFoundException when conversation does not exist', async () => {
            mockConversationService.findOneByIdInWorkspace.mockResolvedValue(
                null
            );

            await expect(
                controller.updateStatus(
                    workspace,
                    'nonexistent-id',
                    {
                        status: ENUM_CONVERSATION_STATUS.RESOLVED,
                    } as any,
                    user
                )
            ).rejects.toThrow(NotFoundException);
        });

        it('should throw NotFoundException (same as non-existent) when conversation belongs to another workspace', async () => {
            mockConversationService.findOneByIdInWorkspace.mockResolvedValue(
                null
            );

            await expect(
                controller.updateStatus(
                    workspace,
                    'conv-in-other-workspace',
                    { status: ENUM_CONVERSATION_STATUS.RESOLVED } as any,
                    user
                )
            ).rejects.toThrow(NotFoundException);

            expect(mockConversationService.updateStatus).not.toHaveBeenCalled();
        });
    });

    describe('updateBot', () => {
        it('should toggle the bot and return mapped result without notifying', async () => {
            const dto = { botEnabled: false, reason: 'Handling myself' };
            const updated = { ...mockConversation, botEnabled: false };

            mockConversationService.findOneByIdInWorkspace.mockResolvedValue(
                mockConversation
            );
            mockConversationService.setBotEnabled.mockResolvedValue(updated);

            const result = await controller.updateBot(
                workspace,
                'conv-1',
                dto as any,
                user
            );

            expect(
                mockConversationService.findOneByIdInWorkspace
            ).toHaveBeenCalledWith('conv-1', workspaceId);
            expect(mockConversationService.setBotEnabled).toHaveBeenCalledWith(
                'conv-1',
                false,
                'Handling myself'
            );
            expect(
                mockConversationService.notifyOperators
            ).not.toHaveBeenCalled();
            expect(result).toEqual({ data: mockMappedConversation });
        });

        it('should throw NotFoundException when conversation does not exist', async () => {
            mockConversationService.findOneByIdInWorkspace.mockResolvedValue(
                null
            );

            await expect(
                controller.updateBot(
                    workspace,
                    'nonexistent-id',
                    {
                        botEnabled: true,
                    } as any,
                    user
                )
            ).rejects.toThrow(NotFoundException);
        });

        it('should throw NotFoundException (same as non-existent) when conversation belongs to another workspace', async () => {
            mockConversationService.findOneByIdInWorkspace.mockResolvedValue(
                null
            );

            await expect(
                controller.updateBot(
                    workspace,
                    'conv-in-other-workspace',
                    { botEnabled: true } as any,
                    user
                )
            ).rejects.toThrow(NotFoundException);

            expect(
                mockConversationService.setBotEnabled
            ).not.toHaveBeenCalled();
        });
    });

    describe('sendMessage', () => {
        const dto = { text: 'Hi! How can I help?', attachments: undefined };
        const sentMessage = {
            id: 'msg-1',
            text: dto.text,
        };
        const mappedMessage = { id: 'msg-1', text: dto.text } as any;

        it('sends the operator reply and returns the mapped message', async () => {
            mockConversationMessagingService.sendOperatorReply.mockResolvedValue(
                sentMessage
            );
            mockConversationService.findOneByIdInWorkspace.mockResolvedValue(
                mockConversation
            );
            mockConversationMessagingService.buildUserNameMap.mockResolvedValue(
                new Map()
            );
            mockConversationMessagingService.mapMessage.mockReturnValue(
                mappedMessage
            );

            const result = await controller.sendMessage(
                workspace,
                'conv-1',
                dto as any,
                user
            );

            expect(
                mockConversationMessagingService.sendOperatorReply
            ).toHaveBeenCalledWith(
                'conv-1',
                workspaceId,
                operatorId,
                dto.text,
                dto.attachments
            );
            expect(
                mockConversationService.findOneByIdInWorkspace
            ).toHaveBeenCalledWith('conv-1', workspaceId);
            expect(result).toEqual({ data: mappedMessage });
        });

        it('propagates the 404 thrown for a conversation in another workspace', async () => {
            mockConversationMessagingService.sendOperatorReply.mockRejectedValue(
                new NotFoundException({
                    message: 'conversation.error.notFound',
                    statusCode: 404,
                })
            );

            await expect(
                controller.sendMessage(
                    workspace,
                    'conv-other-workspace',
                    dto as any,
                    user
                )
            ).rejects.toBeInstanceOf(NotFoundException);

            expect(
                mockActivityService.createByUserWithWorkspace
            ).not.toHaveBeenCalled();
        });
    });

    describe('reactToMessage', () => {
        const dto = { emoji: '❤️', action: 'react' as const };
        const reactedMessage = { id: 'msg-1', reactions: [] } as any;

        it('reacts to the message and returns the result', async () => {
            mockConversationMessagingService.reactToMessage.mockResolvedValue(
                reactedMessage
            );

            const result = await controller.reactToMessage(
                workspace,
                'conv-1',
                'msg-1',
                dto as any,
                user
            );

            expect(
                mockConversationMessagingService.reactToMessage
            ).toHaveBeenCalledWith({
                conversationId: 'conv-1',
                workspaceId,
                messageId: 'msg-1',
                emoji: dto.emoji,
                action: dto.action,
                operatorUserId: operatorId,
            });
            expect(result).toEqual({ data: reactedMessage });
        });

        it('propagates the 404 thrown for a conversation in another workspace', async () => {
            mockConversationMessagingService.reactToMessage.mockRejectedValue(
                new NotFoundException({
                    message: 'conversation.error.notFound',
                    statusCode: 404,
                })
            );

            await expect(
                controller.reactToMessage(
                    workspace,
                    'conv-other-workspace',
                    'msg-1',
                    dto as any,
                    user
                )
            ).rejects.toBeInstanceOf(NotFoundException);

            expect(
                mockActivityService.createByUserWithWorkspace
            ).not.toHaveBeenCalled();
        });
    });
});
