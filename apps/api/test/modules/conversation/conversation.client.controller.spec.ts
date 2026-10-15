import { NotFoundException } from '@nestjs/common';
import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { ConversationClientController } from '../../../src/modules/conversation/controllers/conversation.client.controller';
import { ClientCredentialGuard } from '../../../src/modules/client-credential/guards/client-credential.guard';
import { ClientCredentialPolicyGuard } from '../../../src/modules/client-credential/guards/client-credential.policy.guard';
import { CLIENT_CREDENTIAL_POLICY_ABILITY_META_KEY } from '../../../src/modules/client-credential/constants/client-credential.constant';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from '../../../src/modules/policy/enums/policy.enum';
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
    updateStatus: jest.fn(),
    setBotEnabled: jest.fn(),
    setTimezone: jest.fn(),
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
    sendOperatorReply: jest.fn(),
    mapMessage: jest.fn(),
};

const mockActivityService = {
    createByUserWithWorkspace: jest.fn(),
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

    it.each([
        'list',
        'get',
        'listMessages',
        'sendMessage',
        'updateStatus',
        'updateBot',
        'updateTimezone',
    ] as const)(
        '%s is guarded by the client credential and the creator policy',
        handler => {
            expect(
                Reflect.getMetadata(
                    GUARDS_METADATA,
                    ConversationClientController.prototype[handler]
                )
            ).toEqual([ClientCredentialGuard, ClientCredentialPolicyGuard]);
        }
    );

    // Same ability as the matching workspace route: the key can do no more
    // than its creator.
    it.each(['list', 'get', 'listMessages'] as const)(
        '%s requires CHATBOT read',
        handler => {
            expect(
                Reflect.getMetadata(
                    CLIENT_CREDENTIAL_POLICY_ABILITY_META_KEY,
                    ConversationClientController.prototype[handler]
                )
            ).toEqual([
                {
                    subject: ENUM_POLICY_SUBJECT.CHATBOT,
                    action: [ENUM_POLICY_ACTION.READ],
                },
            ]);
        }
    );

    it.each([
        'sendMessage',
        'updateStatus',
        'updateBot',
        'updateTimezone',
    ] as const)('%s requires CHATBOT update', handler => {
        expect(
            Reflect.getMetadata(
                CLIENT_CREDENTIAL_POLICY_ABILITY_META_KEY,
                ConversationClientController.prototype[handler]
            )
        ).toEqual([
            {
                subject: ENUM_POLICY_SUBJECT.CHATBOT,
                action: [ENUM_POLICY_ACTION.UPDATE],
            },
        ]);
    });

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
        it('returns the conversation of the credential workspace', async () => {
            const conversation = { id: 'conv-1' };
            mockConversationService.findOneByIdInWorkspace.mockResolvedValue(
                conversation
            );
            mockConversationService.mapGet.mockReturnValue({ id: 'conv-1' });

            const result = await controller.get(workspace, 'conv-1');

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
            expect(result).toEqual({ data: { id: 'conv-1' } });
        });

        it('returns 404 for a conversation outside the workspace', async () => {
            mockConversationService.findOneByIdInWorkspace.mockResolvedValue(
                null
            );

            await expect(
                controller.get(workspace, 'conv-elsewhere')
            ).rejects.toBeInstanceOf(NotFoundException);
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

        it('lists messages scoped to the workspace', async () => {
            const result = await controller.listMessages(workspace, 'conv-1');

            expect(mockMessagingService.listMessages).toHaveBeenCalledWith(
                'conv-1',
                'workspace-1',
                { limit: 50, offset: 0 }
            );
            expect(result).toEqual({
                _pagination: { total: 2, totalPage: 1 },
                data: [{ id: 'msg-1' }, { id: 'msg-2' }],
            });
        });

        it('pages with perPage capped at 100', async () => {
            await controller.listMessages(workspace, 'conv-1', 3, 500);

            expect(mockMessagingService.listMessages).toHaveBeenCalledWith(
                'conv-1',
                'workspace-1',
                { limit: 100, offset: 200 }
            );
        });
    });

    // Writes act as the credential's creator: the reply is theirs, and the
    // activity log records them, as it would for the same action in the app.
    describe('sendMessage', () => {
        it('sends the reply as the creator and logs it', async () => {
            const message = { id: 'msg-1' };
            const conversation = { id: 'conv-1', senderId: 'sender-1' };
            mockMessagingService.sendOperatorReply.mockResolvedValue(message);
            mockConversationService.findOneByIdInWorkspace.mockResolvedValue(
                conversation
            );
            mockMessagingService.buildUserNameMap.mockResolvedValue(new Map());
            mockMessagingService.mapMessage.mockResolvedValue({
                id: 'msg-1',
            });

            const result = await controller.sendMessage(
                workspace,
                credential,
                'conv-1',
                { text: 'Hello' }
            );

            expect(mockMessagingService.sendOperatorReply).toHaveBeenCalledWith(
                'conv-1',
                'workspace-1',
                'creator-1',
                'Hello'
            );
            expect(
                mockActivityService.createByUserWithWorkspace
            ).toHaveBeenCalledWith(credential.createdBy, workspace, {
                action: 'create',
                subject: ENUM_POLICY_SUBJECT.CONVERSATION,
                metadata: { id: 'conv-1', name: 'sender-1' },
            });
            expect(result).toEqual({ data: { id: 'msg-1' } });
        });
    });

    describe.each([
        [
            'updateStatus',
            'updateStatus',
            { status: 'RESOLVED', reason: 'done' },
            ['conv-1', 'RESOLVED', 'done'],
        ],
        [
            'updateBot',
            'setBotEnabled',
            { botEnabled: false, reason: 'mine' },
            ['conv-1', false, 'mine'],
        ],
        [
            'updateTimezone',
            'setTimezone',
            { timezone: 'America/New_York' },
            ['conv-1', 'America/New_York'],
        ],
    ] as const)('%s', (handler, serviceMethod, dto, serviceArgs) => {
        it('changes a conversation in the credential workspace and logs it', async () => {
            const conversation = { id: 'conv-1', senderId: 'sender-1' };
            mockConversationService.findOneByIdInWorkspace.mockResolvedValue(
                conversation
            );
            mockConversationService[serviceMethod].mockResolvedValue({
                id: 'conv-1',
            });
            mockConversationService.mapGet.mockReturnValue({ id: 'conv-1' });

            const result = await controller[handler](
                workspace,
                credential,
                'conv-1',
                dto as any
            );

            expect(
                mockConversationService.findOneByIdInWorkspace
            ).toHaveBeenCalledWith('conv-1', 'workspace-1');
            expect(mockConversationService[serviceMethod]).toHaveBeenCalledWith(
                ...serviceArgs
            );
            expect(
                mockActivityService.createByUserWithWorkspace
            ).toHaveBeenCalledWith(credential.createdBy, workspace, {
                action: 'update',
                subject: ENUM_POLICY_SUBJECT.CONVERSATION,
                metadata: { id: 'conv-1', name: 'sender-1' },
            });
            expect(result).toEqual({ data: { id: 'conv-1' } });
        });

        it('404s a conversation outside the credential workspace', async () => {
            mockConversationService.findOneByIdInWorkspace.mockResolvedValue(
                null
            );

            await expect(
                controller[handler](workspace, credential, 'other', dto as any)
            ).rejects.toBeInstanceOf(NotFoundException);
            expect(
                mockConversationService[serviceMethod]
            ).not.toHaveBeenCalled();
        });
    });
});
