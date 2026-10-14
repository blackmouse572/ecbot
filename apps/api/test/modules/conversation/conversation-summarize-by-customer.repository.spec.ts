import { ConversationRepository } from '../../../src/modules/conversation/repository/repositories/conversation.repository';

describe('ConversationRepository.summarizeByCustomerIds', () => {
    const buildRepo = (execute: jest.Mock): ConversationRepository => {
        const em = { getConnection: () => ({ execute }) } as any;
        return new ConversationRepository(em);
    };

    it('returns nothing for empty input without hitting the DB', async () => {
        const execute = jest.fn();

        const result = await buildRepo(execute).summarizeByCustomerIds(
            [],
            'ws-1'
        );

        expect(result).toEqual([]);
        expect(execute).not.toHaveBeenCalled();
    });

    it('counts per customer, scoped to the workspace through chatbots', async () => {
        const execute = jest.fn().mockResolvedValue([
            {
                customer_id: 'c1',
                conversation_count: '2',
                channels: ['FACEBOOK_PAGE', 'ZALO_PAGE'],
            },
        ]);

        const result = await buildRepo(execute).summarizeByCustomerIds(
            ['c1'],
            'ws-1'
        );

        expect(result).toEqual([
            {
                customerId: 'c1',
                conversationCount: 2,
                channels: ['FACEBOOK_PAGE', 'ZALO_PAGE'],
            },
        ]);
        expect(execute.mock.calls[0][1]).toEqual([['c1'], 'ws-1']);
        const sql = execute.mock.calls[0][0] as string;
        expect(sql).toContain('JOIN chatbots cb ON cb.id = conv.chatbot_id');
        expect(sql).toContain('cb.workspace_id = ?::uuid');
        expect(sql).toContain('conv.deleted_at IS NULL');
    });
});
