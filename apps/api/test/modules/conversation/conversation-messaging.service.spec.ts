import { MessageMediaService } from '../../../src/modules/conversation/services/message-media.service';
import {
    NotFoundException,
    UnprocessableEntityException,
} from '@nestjs/common';
import { ENUM_ACCOUNT_TYPE } from '../../../src/modules/account/enums/account.enum';
import {
    ENUM_MESSAGE_AUTHOR,
    ENUM_MESSAGE_STATUS,
} from '../../../src/modules/conversation/enums/message.enum';
import { ConversationEntity } from '../../../src/modules/conversation/repository/entities/conversation.entity';
import { MessageEntity } from '../../../src/modules/conversation/repository/entities/message.entity';
import { ConversationMessagingService } from '../../../src/modules/conversation/services/conversation-messaging.service';

const mockS3 = {
    signGetUrl: jest.fn(async (key: string) => `https://s3/${key}?sig`),
};

describe('ConversationMessagingService', () => {
    let service: ConversationMessagingService;

    const mockConversationRepository = {
        findOneById: jest.fn(),
    };

    const mockMessageRepository = {
        insertPendingOutbound: jest.fn(),
        markOutboundSent: jest.fn(),
        markOutboundFailed: jest.fn(),
        findByConversation: jest.fn(),
        countByConversation: jest.fn().mockResolvedValue(0),
        findOne: jest.fn(),
        applyReaction: jest.fn(),
    };

    const mockAdapter = {
        type: ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE,
        sendMessage: jest.fn(),
        addReaction: jest.fn(),
        capabilities: { reactions: { inbound: true, outbound: true } },
    };

    const mockPlatformRegistry = {
        get: jest.fn(() => mockAdapter),
    };

    const mockUserRepository = {
        find: jest.fn(),
    };

    const mockToolInvocationRepository = {
        find: jest.fn().mockResolvedValue([]),
    };

    const buildService = () =>
        new ConversationMessagingService(
            mockConversationRepository as any,
            mockMessageRepository as any,
            mockUserRepository as any,
            mockToolInvocationRepository as any,
            { get: jest.fn(() => mockPlatformRegistry) } as any,
            new MessageMediaService(mockS3 as any)
        );

    const facebookAccount = {
        id: 'account-1',
        externalId: 'page-123',
        type: ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE,
        accessToken: 'page-access-token',
    };

    const conversation = {
        id: 'conv-1',
        senderId: 'user-psid-456',
        account: facebookAccount,
    };

    beforeEach(() => {
        jest.clearAllMocks();

        service = buildService();

        mockPlatformRegistry.get.mockReturnValue(mockAdapter);
        mockAdapter.capabilities.reactions.outbound = true;
    });

    describe('sendOperatorReply', () => {
        it('should save a pending message, deliver via adapter, and mark it sent', async () => {
            const clientNonce = 'some-uuid';
            const platformMessageId = 'mid.abc123';

            mockConversationRepository.findOneById.mockResolvedValue(
                conversation
            );
            mockMessageRepository.insertPendingOutbound.mockResolvedValue({
                id: 'msg-1',
                clientNonce,
                status: ENUM_MESSAGE_STATUS.PENDING,
                authorType: ENUM_MESSAGE_AUTHOR.OPERATOR,
                text: 'Hello from operator',
            });
            mockAdapter.sendMessage.mockResolvedValue({
                externalId: platformMessageId,
            });
            mockMessageRepository.markOutboundSent.mockResolvedValue(undefined);

            const result = await service.sendOperatorReply(
                'conv-1',
                'operator-user-id',
                'Hello from operator'
            );

            expect(mockPlatformRegistry.get).toHaveBeenCalledWith(
                ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE
            );
            expect(mockAdapter.sendMessage).toHaveBeenCalledWith(
                facebookAccount,
                'user-psid-456',
                {
                    content: { kind: 'text', text: 'Hello from operator' },
                    fallbackText: 'Hello from operator',
                }
            );

            expect(
                mockMessageRepository.insertPendingOutbound
            ).toHaveBeenCalledWith(
                'conv-1',
                expect.any(String),
                expect.objectContaining({
                    authorType: ENUM_MESSAGE_AUTHOR.OPERATOR,
                    authorId: 'operator-user-id',
                    text: 'Hello from operator',
                })
            );
            expect(mockMessageRepository.markOutboundSent).toHaveBeenCalledWith(
                expect.any(String),
                platformMessageId
            );

            expect(result.status).toBe(ENUM_MESSAGE_STATUS.SENT);
            expect(result.externalId).toBe(platformMessageId);
        });

        it('should mark the message as failed and throw when the platform send fails', async () => {
            mockConversationRepository.findOneById.mockResolvedValue(
                conversation
            );
            mockMessageRepository.insertPendingOutbound.mockResolvedValue({
                id: 'msg-1',
                status: ENUM_MESSAGE_STATUS.PENDING,
            });
            mockAdapter.sendMessage.mockRejectedValue(
                new Error('Graph API rate limit exceeded')
            );
            mockMessageRepository.markOutboundFailed.mockResolvedValue(
                undefined
            );

            await expect(
                service.sendOperatorReply('conv-1', 'operator-user-id', 'Hello')
            ).rejects.toThrow(UnprocessableEntityException);

            expect(mockMessageRepository.markOutboundFailed).toHaveBeenCalled();
            expect(
                mockMessageRepository.markOutboundSent
            ).not.toHaveBeenCalled();
        });

        it('should throw NotFoundException when the conversation does not exist', async () => {
            mockConversationRepository.findOneById.mockResolvedValue(null);

            await expect(
                service.sendOperatorReply(
                    'conv-ghost',
                    'operator-user-id',
                    'Hello'
                )
            ).rejects.toThrow(NotFoundException);

            expect(
                mockMessageRepository.insertPendingOutbound
            ).not.toHaveBeenCalled();
        });

        it('persists attachments in the DB record but sends plain text to the platform adapter', async () => {
            const attachments = [
                { type: 'image', url: 'https://example.com/img.png' },
            ];

            mockConversationRepository.findOneById.mockResolvedValue(
                conversation
            );
            mockMessageRepository.insertPendingOutbound.mockResolvedValue({
                id: 'msg-1',
                status: ENUM_MESSAGE_STATUS.PENDING,
            });
            mockAdapter.sendMessage.mockResolvedValue({
                externalId: 'mid.xyz',
            });

            await service.sendOperatorReply(
                'conv-1',
                'operator-user-id',
                'See attached',
                attachments
            );

            expect(
                mockMessageRepository.insertPendingOutbound
            ).toHaveBeenCalledWith(
                'conv-1',
                expect.any(String),
                expect.objectContaining({ attachments })
            );
            expect(mockAdapter.sendMessage).toHaveBeenCalledWith(
                facebookAccount,
                'user-psid-456',
                {
                    content: { kind: 'text', text: 'See attached' },
                    fallbackText: 'See attached',
                }
            );
        });
    });

    describe('reactToMessage', () => {
        const message = {
            id: 'msg-1',
            externalId: 'mid.abc123',
            authorType: ENUM_MESSAGE_AUTHOR.USER,
            authorId: 'user-psid-456',
        };

        it('reacts via the adapter and persists the reaction', async () => {
            mockConversationRepository.findOneById.mockResolvedValue(
                conversation
            );
            mockMessageRepository.findOne.mockResolvedValue(message);
            mockAdapter.addReaction.mockResolvedValue(undefined);
            mockMessageRepository.applyReaction.mockResolvedValue({
                ...message,
                reactions: [{ emoji: '❤', actorType: 'operator' }],
            });
            mockUserRepository.find.mockResolvedValue([]);

            await service.reactToMessage({
                conversationId: 'conv-1',
                messageId: 'msg-1',
                emoji: '❤',
                action: 'react',
                operatorUserId: 'operator-user-id',
            });

            expect(mockAdapter.addReaction).toHaveBeenCalledWith(
                facebookAccount,
                'user-psid-456',
                'mid.abc123',
                '❤',
                'react'
            );
            expect(mockMessageRepository.applyReaction).toHaveBeenCalledWith(
                'conv-1',
                'mid.abc123',
                {
                    emoji: '❤',
                    actorType: 'operator',
                    actorId: 'operator-user-id',
                    action: 'react',
                }
            );
        });

        it('throws when the adapter does not support outbound reactions', async () => {
            mockConversationRepository.findOneById.mockResolvedValue(
                conversation
            );
            mockMessageRepository.findOne.mockResolvedValue(message);
            mockAdapter.capabilities.reactions.outbound = false;

            await expect(
                service.reactToMessage({
                    conversationId: 'conv-1',
                    messageId: 'msg-1',
                    emoji: '❤',
                    action: 'react',
                    operatorUserId: 'operator-user-id',
                })
            ).rejects.toThrow(UnprocessableEntityException);

            expect(mockAdapter.addReaction).not.toHaveBeenCalled();
            expect(mockMessageRepository.applyReaction).not.toHaveBeenCalled();
        });

        it('throws NotFoundException when the conversation does not exist', async () => {
            mockConversationRepository.findOneById.mockResolvedValue(null);

            await expect(
                service.reactToMessage({
                    conversationId: 'conv-ghost',
                    messageId: 'msg-1',
                    emoji: '❤',
                    action: 'react',
                    operatorUserId: 'operator-user-id',
                })
            ).rejects.toThrow(NotFoundException);
        });

        it('throws NotFoundException when the message does not exist', async () => {
            mockConversationRepository.findOneById.mockResolvedValue(
                conversation
            );
            mockMessageRepository.findOne.mockResolvedValue(null);

            await expect(
                service.reactToMessage({
                    conversationId: 'conv-1',
                    messageId: 'msg-ghost',
                    emoji: '❤',
                    action: 'react',
                    operatorUserId: 'operator-user-id',
                })
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('listMessages', () => {
        it('should return the message history for an existing conversation', async () => {
            const messages = [
                {
                    id: 'msg-1',
                    authorType: ENUM_MESSAGE_AUTHOR.USER,
                    text: 'Hi',
                },
                {
                    id: 'msg-2',
                    authorType: ENUM_MESSAGE_AUTHOR.BOT,
                    text: 'Hello!',
                },
                {
                    id: 'msg-3',
                    authorType: ENUM_MESSAGE_AUTHOR.OPERATOR,
                    text: 'Helping you now.',
                },
            ];

            mockConversationRepository.findOneById.mockResolvedValue({
                id: 'conv-1',
            });
            mockMessageRepository.findByConversation.mockResolvedValue(
                messages
            );
            mockMessageRepository.countByConversation.mockResolvedValue(137);

            const result = await service.listMessages('conv-1', {
                limit: 50,
                offset: 0,
            });

            expect(
                mockMessageRepository.findByConversation
            ).toHaveBeenCalledWith('conv-1', {
                limit: 50,
                offset: 0,
            });
            expect(result.messages).toHaveLength(3);
            expect(result.conversation).toEqual({ id: 'conv-1' });
            // real conversation total, independent of the returned page size
            expect(result.total).toBe(137);
        });

        it('should throw NotFoundException when the conversation does not exist', async () => {
            mockConversationRepository.findOneById.mockResolvedValue(null);

            await expect(service.listMessages('conv-ghost')).rejects.toThrow(
                NotFoundException
            );

            expect(
                mockMessageRepository.findByConversation
            ).not.toHaveBeenCalled();
        });

        it('should return an empty array when the conversation has no messages yet', async () => {
            mockConversationRepository.findOneById.mockResolvedValue({
                id: 'conv-1',
            });
            mockMessageRepository.findByConversation.mockResolvedValue([]);

            const result = await service.listMessages('conv-1');

            expect(result.messages).toHaveLength(0);
        });
    });

    describe('buildUserNameMap', () => {
        // users.id is a uuid column. Imported page messages are OPERATOR with
        // a numeric platform id, and passing that to the query made Postgres
        // reject the whole statement — taking the entire message list with it.
        it('never sends a non-uuid author id to the users query', async () => {
            const service = buildService();
            mockUserRepository.find.mockResolvedValue([]);

            await service.buildUserNameMap([
                {
                    authorId: '111848957952146',
                    authorType: ENUM_MESSAGE_AUTHOR.OPERATOR,
                } as MessageEntity,
                {
                    authorId: '3f7c1b2e-8a4d-4c19-9f2b-1d6e5a0c7b34',
                    authorType: ENUM_MESSAGE_AUTHOR.OPERATOR,
                } as MessageEntity,
            ]);

            expect(mockUserRepository.find).toHaveBeenCalledWith({
                id: { $in: ['3f7c1b2e-8a4d-4c19-9f2b-1d6e5a0c7b34'] },
            });
        });

        it('skips the query entirely when no operator id is a uuid', async () => {
            const service = buildService();
            mockUserRepository.find.mockResolvedValue([]);

            const map = await service.buildUserNameMap([
                {
                    authorId: '111848957952146',
                    authorType: ENUM_MESSAGE_AUTHOR.OPERATOR,
                } as MessageEntity,
            ]);

            expect(mockUserRepository.find).not.toHaveBeenCalled();
            expect(map.size).toBe(0);
        });
    });

    describe('resolveAuthor (via mapMessage)', () => {
        const buildMessage = (overrides: Partial<MessageEntity> = {}) =>
            ({
                authorId: 'a-1',
                authorType: ENUM_MESSAGE_AUTHOR.OPERATOR,
                ...overrides,
            }) as MessageEntity;

        it('uses operator full name from the user-name map', async () => {
            const service = buildService();
            const msg = buildMessage({
                authorId: 'op-1',
                authorType: ENUM_MESSAGE_AUTHOR.OPERATOR,
            });
            const dto = await service.mapMessage(
                msg,
                undefined,
                new Map([['op-1', 'Ada Lovelace']])
            );
            expect(dto.author).toEqual({ id: 'op-1', name: 'Ada Lovelace' });
        });

        // Imported page messages (adapter.reconcile / message_echoes) are
        // OPERATOR but carry the platform's page id, not an eccho user uuid.
        it('names an imported page message after the account, not the raw page id', async () => {
            const service = buildService();
            const msg = buildMessage({
                authorId: '111848957952146',
                authorType: ENUM_MESSAGE_AUTHOR.OPERATOR,
            });
            const conversation = {
                account: { name: 'PeaceMaker and Insensitive' },
            } as any;

            const dto = await service.mapMessage(msg, conversation, new Map());

            expect(dto.author).toEqual({
                id: '111848957952146',
                name: 'PeaceMaker and Insensitive',
            });
        });

        it('falls back to author id when operator is missing from the map', async () => {
            const service = buildService();
            const msg = buildMessage({ authorId: 'op-2' });
            const dto = await service.mapMessage(msg, undefined, new Map());
            expect(dto.author).toEqual({ id: 'op-2', name: 'op-2' });
        });

        it('uses chatbot name for BOT messages when conversation.chatbot is populated', async () => {
            const service = buildService();
            const msg = buildMessage({
                authorId: 'bot-1',
                authorType: ENUM_MESSAGE_AUTHOR.BOT,
            });
            const conversation = {
                chatbot: { name: 'Ecbot Assistant' },
            } as ConversationEntity;
            const dto = await service.mapMessage(msg, conversation);
            expect(dto.author).toEqual({
                id: 'bot-1',
                name: 'Ecbot Assistant',
            });
        });

        it('falls back to author id for BOT when chatbot is not populated', async () => {
            const service = buildService();
            const msg = buildMessage({
                authorId: 'bot-1',
                authorType: ENUM_MESSAGE_AUTHOR.BOT,
            });
            const dto = await service.mapMessage(msg, undefined);
            expect(dto.author).toEqual({ id: 'bot-1', name: 'bot-1' });
        });

        it('uses conversation.senderName for USER messages', async () => {
            const service = buildService();
            const msg = buildMessage({
                authorId: 'u-1',
                authorType: ENUM_MESSAGE_AUTHOR.USER,
            });
            const conversation = {
                senderName: 'Jane Doe',
            } as ConversationEntity;
            const dto = await service.mapMessage(msg, conversation);
            expect(dto.author).toEqual({ id: 'u-1', name: 'Jane Doe' });
        });

        it('falls back to author id for USER when senderName is absent', async () => {
            const service = buildService();
            const msg = buildMessage({
                authorId: 'u-1',
                authorType: ENUM_MESSAGE_AUTHOR.USER,
            });
            const dto = await service.mapMessage(msg, {} as ConversationEntity);
            expect(dto.author).toEqual({ id: 'u-1', name: 'u-1' });
        });
    });

    describe('attachments (via mapMessage)', () => {
        it('exposes image attachments as { type, url } for the inbox', async () => {
            const dto = await buildService().mapMessage({
                authorId: 'bot-1',
                authorType: ENUM_MESSAGE_AUTHOR.BOT,
                attachments: [
                    { type: 'image', url: 'https://cdn/s.jpg', raw: { x: 1 } },
                    { type: 'image', key: 'conversations/c/a.jpg' },
                    'junk',
                ],
            } as unknown as MessageEntity);

            expect(dto.attachments).toEqual([
                { type: 'image', url: 'https://cdn/s.jpg' },
                {
                    type: 'image',
                    url: 'https://s3/conversations/c/a.jpg?sig',
                },
            ]);
        });

        it('defaults to an empty list', async () => {
            const dto = await buildService().mapMessage({
                authorId: 'bot-1',
                authorType: ENUM_MESSAGE_AUTHOR.BOT,
            } as MessageEntity);

            expect(dto.attachments).toEqual([]);
        });
    });
});
