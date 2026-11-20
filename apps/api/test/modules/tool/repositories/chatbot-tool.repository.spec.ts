import { ChatbotToolRepository } from '../../../../src/modules/tool/repository/repositories/chatbot-tool.repository';

describe('ChatbotToolRepository.countChatbotsByTools', () => {
    const buildRepo = (execute: jest.Mock): ChatbotToolRepository => {
        const em = { getConnection: () => ({ execute }) } as any;
        return new ChatbotToolRepository(em);
    };

    it('returns an empty map for no tools without hitting the DB', async () => {
        const execute = jest.fn();

        const counts = await buildRepo(execute).countChatbotsByTools([]);

        expect(counts.size).toBe(0);
        expect(execute).not.toHaveBeenCalled();
    });

    it('counts only live agents with the tool turned on', async () => {
        const execute = jest.fn().mockResolvedValue([]);

        await buildRepo(execute).countChatbotsByTools(['t1', 't2']);

        const [sql, bindings] = execute.mock.calls[0];
        expect(sql).toContain('COUNT(DISTINCT link.chatbot_id)');
        expect(sql).toContain('JOIN chatbots ON chatbots.id = link.chatbot_id');
        expect(sql).toContain('link.tool_id IN (?)');
        expect(sql).toContain('AND link.enabled');
        expect(sql).toContain('AND NOT link.deleted');
        expect(sql).toContain('AND chatbots.deleted_at IS NULL');
        expect(sql).toContain('GROUP BY link.tool_id');
        expect(bindings).toEqual([['t1', 't2']]);
    });

    it('turns the string counts Postgres returns into numbers', async () => {
        const execute = jest
            .fn()
            .mockResolvedValue([{ id: 't1', chatbot_count: '3' }]);

        const counts = await buildRepo(execute).countChatbotsByTools([
            't1',
            't2',
        ]);

        expect(counts.get('t1')).toBe(3);
        expect(counts.has('t2')).toBe(false);
    });
});
