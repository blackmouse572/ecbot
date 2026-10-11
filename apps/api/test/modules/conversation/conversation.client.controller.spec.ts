import { NotFoundException } from '@nestjs/common';
import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { ConversationClientController } from '../../../src/modules/conversation/controllers/conversation.client.controller';
import { ClientCredentialGuard } from '../../../src/modules/client-credential/guards/client-credential.guard';
import { ENUM_POLICY_SUBJECT } from '../../../src/modules/policy/enums/policy.enum';
import { WorkspaceEntity } from '../../../src/modules/workspace/repository/entities/workspace.entity';

// /client surface: scoped to the credential's workspace, and acting as the
// credential's creator wherever the workspace routes act as the operator
// (unread counts, and the view entries the activity log keeps for reads).

const mockConversationService = {
    findByWorkspace: jest.fn(),
    countByWorkspace: jest.fn(),
    getUnreadCounts: jest.fn(),
    mapList: jest.fn(),
    findOneByIdInWorkspace: jest.fn(),
    mapGet: jest.fn(),
};

const mockPaginationService = {
    totalPage: jest.fn((total: number, limit: number) =>
        Math.ceil(total / limit)
    ),
};

const mockMessagingService = {
    listMessages: jest.fn(),
    buildUserNameMap: jest.fn(),
    listToolInvocations: jest.fn(),
    mapMessages: jest.fn(),
};

const mockActivityService = {
    createView: jest.fn(),
};

describe('ConversationClientController', () => {
    const workspace = { id: 'workspace-1' } as WorkspaceEntity;
    const credential = { createdBy: { id: 'creator-1' } } as any;
    let controller: ConversationClientController;

    beforeEach(() => {
        jest.clearAllMocks();
        controller = new ConversationClientController(
            mockConversationService as any,
            mockPaginationService as any,
            mockMessagingService as any,
            mockActivityService as any
        );
    });

    it('is mounted at /conversations', () => {
        expect(
            Reflect.getMetadata(PATH_METADATA, ConversationClientController)
        ).toBe('/conversations');
    });

    it.each(['list', 'get', 'listMessages'] as const)(
        '%s is guarded by the client credential only',
        handler => {
            expect(
                Reflect.getMetadata(
                    GUARDS_METADATA,
                    ConversationClientController.prototype[handler]
                )
            ).toEqual([ClientCredentialGuard]);
        }
    );

    // @repo/client is generated from these docs, so an undocumented filter
    // is one the MCP server can't send.
    it('documents every list filter it accepts', () => {
        const documented = Reflect.getMetadata(
            'swagger/apiParameters', // @nestjs/swagger DECORATORS.API_PARAMETERS
            ConversationClientController.prototype.list
        ).map((param: { name: string }) => param.name);

        expect(documented).toEqual(
            expect.arrayContaining([
                'status',
                'accountType',
                'account',
                'chatbot',
                'botEnabled',
            ])
        );
    });

    describe('list', () => {
        it('lists the credential workspace conversations with the creator unread counts', async () => {
            const conversations = [{ id: 'conv-1' }];
            const unread = new Map([['conv-1', 2]]);
            const mapped = [{ id: 'conv-1', unreadCount: 2 }];
            mockConversationService.findByWorkspace.mockResolvedValue(
                conversations
            );
            mockConversationService.countByWorkspace.mockResolvedValue(1);
            mockConversationService.getUnreadCounts.mockResolvedValue(unread);
            mockConversationService.mapList.mockReturnValue(mapped);

            const result = await controller.list(
                workspace,
                credential,
                {
                    _limit: 20,
                    _offset: 0,
                    _order: { lastMessageAt: 'desc' },
                    _search: {},
                } as any,
                { status: { $in: ['OPEN'] } },
                {},
                {},
                { chatbot: { id: 'chatbot-1' } },
                {}
            );

            const find = {
                status: { $in: ['OPEN'] },
                chatbot: { id: 'chatbot-1' },
            };
            expect(
                mockConversationService.findByWorkspace
            ).toHaveBeenCalledWith('workspace-1', find, {
                paging: { limit: 20, offset: 0 },
                order: { lastMessageAt: 'desc' },
            });
            expect(
                mockConversationService.countByWorkspace
            ).toHaveBeenCalledWith('workspace-1', find);
            expect(
                mockConversationService.getUnreadCounts
            ).toHaveBeenCalledWith('creator-1', ['conv-1'], 'workspace-1');
            expect(mockConversationService.mapList).toHaveBeenCalledWith(
                conversations,
                unread
            );
            expect(result).toEqual({
                _pagination: { total: 1, totalPage: 1 },
                data: mapped,
            });
        });
    });

    describe('get', () => {
        it('returns the conversation and logs the view as the creator', async () => {
            const conversation = { id: 'conv-1' };
            mockConversationService.findOneByIdInWorkspace.mockResolvedValue(
                conversation
            );
            mockConversationService.mapGet.mockReturnValue({ id: 'conv-1' });

            const result = await controller.get(
                workspace,
                credential,
                'conv-1'
            );

            expect(
                mockConversationService.findOneByIdInWorkspace
            ).toHaveBeenCalledWith('conv-1', 'workspace-1', {
                populate: [
                    'account',
                    'chatbot',
                    'contactPoint',
                    'contactPoint.customer',
                ],
            });
            expect(mockActivityService.createView).toHaveBeenCalledWith(
                'creator-1',
                workspace,
                ENUM_POLICY_SUBJECT.CONVERSATION,
                { id: 'conv-1' }
            );
            expect(result).toEqual({ data: { id: 'conv-1' } });
        });

        it('returns 404 for a conversation outside the workspace, without logging a view', async () => {
            mockConversationService.findOneByIdInWorkspace.mockResolvedValue(
                null
            );

            await expect(
                controller.get(workspace, credential, 'conv-elsewhere')
            ).rejects.toBeInstanceOf(NotFoundException);
            expect(mockActivityService.createView).not.toHaveBeenCalled();
        });
    });

    describe('listMessages', () => {
        const conversation = { id: 'conv-1' };
        const messages = [
            { id: 'msg-1', dateSent: new Date('2026-10-01T10:00:00Z') },
            { id: 'msg-2', dateSent: new Date('2026-10-01T10:05:00Z') },
        ];

        beforeEach(() => {
            mockMessagingService.listMessages.mockResolvedValue({
                messages,
                conversation,
                total: 2,
            });
            mockMessagingService.buildUserNameMap.mockResolvedValue(new Map());
            mockMessagingService.listToolInvocations.mockResolvedValue([]);
            mockMessagingService.mapMessages.mockResolvedValue([
                { id: 'msg-1' },
                { id: 'msg-2' },
            ]);
        });

        it('lists messages scoped to the workspace and logs the first page as a view', async () => {
            const result = await controller.listMessages(
                workspace,
                credential,
                'conv-1'
            );

            expect(mockMessagingService.listMessages).toHaveBeenCalledWith(
                'conv-1',
                'workspace-1',
                { limit: 50, offset: 0 }
            );
            expect(mockActivityService.createView).toHaveBeenCalledWith(
                'creator-1',
                workspace,
                ENUM_POLICY_SUBJECT.CONVERSATION,
                { id: 'conv-1', resource: 'messages' }
            );
            expect(result).toEqual({
                _pagination: { total: 2, totalPage: 1 },
                data: [{ id: 'msg-1' }, { id: 'msg-2' }],
            });
        });

        it('pages with perPage capped at 100 and logs only the first page', async () => {
            await controller.listMessages(
                workspace,
                credential,
                'conv-1',
                3,
                500
            );

            expect(mockMessagingService.listMessages).toHaveBeenCalledWith(
                'conv-1',
                'workspace-1',
                { limit: 100, offset: 200 }
            );
            expect(mockActivityService.createView).not.toHaveBeenCalled();
        });
    });
});
