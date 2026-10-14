import { ConversationRepository } from '@app/modules/conversation/repository/repositories/conversation.repository';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from '@app/common/pagination/enums/pagination.enum';
import { EntityManager, QueryOrder } from '@mikro-orm/postgresql';

// The inbox lists the conversation with the newest message first. Older rows
// may have no lastMessageAt; Postgres sorts nulls first on DESC, so they
// would sit on top of every live chat.
describe('ConversationRepository list order', () => {
    let repo: ConversationRepository;

    beforeEach(() => {
        repo = new ConversationRepository({} as EntityManager);
    });

    it('sorts by last message with nulls last, newest created breaking ties', async () => {
        const find = jest.spyOn(repo as any, 'find').mockResolvedValue([]);

        await repo.findByWorkspace(
            'ws-1',
            {},
            {
                paging: { limit: 50, offset: 0 },
                order: {
                    lastMessageAt: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC,
                },
            }
        );

        expect(find).toHaveBeenCalledWith(expect.anything(), {
            populate: ['chatbot', 'account'],
            paging: { limit: 50, offset: 0 },
            orderBy: {
                lastMessageAt: QueryOrder.DESC_NULLS_LAST,
                createdAt: QueryOrder.DESC,
            },
        });
    });

    it('keeps any other order as it is', async () => {
        const find = jest.spyOn(repo as any, 'find').mockResolvedValue([]);
        const order = { createdAt: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.ASC };

        await repo.findByWorkspace('ws-1', {}, { order });

        expect(find).toHaveBeenCalledWith(expect.anything(), {
            populate: ['chatbot', 'account'],
            order,
        });
    });
});
