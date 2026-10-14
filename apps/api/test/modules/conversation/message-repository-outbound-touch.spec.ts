import { ConversationEntity } from '@app/modules/conversation/repository/entities/conversation.entity';
import { MessageRepository } from '@app/modules/conversation/repository/repositories/message.repository';
import {
    ENUM_MESSAGE_AUTHOR,
    ENUM_MESSAGE_DIRECTION,
} from '@app/modules/conversation/enums/message.enum';

// The inbox sorts by lastMessageAt, so any new message (bot, staff or
// follow-up reply included) moves its conversation to the top.
describe('MessageRepository outbound bumps lastMessageAt', () => {
    const dateSent = new Date('2026-10-14T10:00:00Z');
    let repo: any;
    let nativeUpdate: jest.Mock;

    beforeEach(() => {
        repo = Object.create(MessageRepository.prototype);
        nativeUpdate = jest.fn().mockResolvedValue(1);
        repo.em = { nativeUpdate };
        repo.create = jest.fn().mockImplementation(async d => d);
        repo.findOne = jest.fn().mockResolvedValue(null);
    });

    it('touches the conversation when a reply is queued', async () => {
        await repo.insertPendingOutbound('c-1', 'nonce', {
            authorType: ENUM_MESSAGE_AUTHOR.BOT,
            authorId: 'bot',
            text: 'hi',
            dateSent,
        });

        expect(nativeUpdate).toHaveBeenCalledWith(
            ConversationEntity,
            { id: 'c-1' },
            { lastMessageAt: dateSent }
        );
    });

    it('touches the conversation when staff reply from the platform app', async () => {
        await repo.upsertByExternalId('c-1', 'ext-1', {
            direction: ENUM_MESSAGE_DIRECTION.OUTBOUND,
            authorType: ENUM_MESSAGE_AUTHOR.OPERATOR,
            authorId: 'page',
            text: 'hi',
            dateSent,
        });

        expect(nativeUpdate).toHaveBeenCalledWith(
            ConversationEntity,
            { id: 'c-1' },
            { lastMessageAt: dateSent }
        );
    });

    it('leaves inbound messages to the inbound path', async () => {
        await repo.upsertByExternalId('c-1', 'ext-1', {
            direction: ENUM_MESSAGE_DIRECTION.INBOUND,
            authorType: ENUM_MESSAGE_AUTHOR.USER,
            authorId: 'psid',
            text: 'hi',
            dateSent,
        });

        expect(nativeUpdate).not.toHaveBeenCalled();
    });
});
