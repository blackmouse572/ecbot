import { MessageRepository } from '@app/modules/conversation/repository/repositories/message.repository';
import { ENUM_MESSAGE_DIRECTION } from '@app/modules/conversation/enums/message.enum';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from '@app/common/pagination/enums/pagination.enum';

describe('MessageRepository.findLatestInbound', () => {
    it('queries newest INBOUND message for the conversation', async () => {
        const findOne = jest.fn().mockResolvedValue({ id: 'msg-9' });
        const repo = Object.create(MessageRepository.prototype) as any;
        repo.findOne = findOne;

        const result = await repo.findLatestInbound('conv-1');

        expect(result).toEqual({ id: 'msg-9' });
        expect(findOne).toHaveBeenCalledWith(
            {
                conversation: 'conv-1',
                direction: ENUM_MESSAGE_DIRECTION.INBOUND,
                deletedAt: null,
            },
            expect.objectContaining({
                order: { dateSent: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC },
            })
        );
    });
});
