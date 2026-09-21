import { ConversationReadRepository } from '../../../src/modules/conversation/repository/repositories/conversation-read.repository';
import { ENUM_MESSAGE_AUTHOR } from '../../../src/modules/conversation/enums/message.enum';

describe('ConversationReadRepository.getUnreadCounts', () => {
    const operatorId = 'op-1';

    const buildRepo = (execute: jest.Mock): ConversationReadRepository => {
        const em = { getConnection: () => ({ execute }) } as any;
        return new ConversationReadRepository(em);
    };

    const workspaceId = 'ws-1';

    it('returns empty map for empty input without hitting the DB', async () => {
        const execute = jest.fn();
        const repo = buildRepo(execute);
        const result = await repo.getUnreadCounts(operatorId, [], workspaceId);
        expect(result.size).toBe(0);
        expect(execute).not.toHaveBeenCalled();
    });

    it('filters by USER author type and binds operator + ids + workspaceId', async () => {
        const execute = jest
            .fn()
            .mockResolvedValue([{ conversation_id: 'c1', unread_count: '3' }]);
        const repo = buildRepo(execute);

        await repo.getUnreadCounts(operatorId, ['c1'], workspaceId);

        expect(execute.mock.calls[0][1]).toEqual([
            operatorId,
            ENUM_MESSAGE_AUTHOR.USER,
            ['c1'],
            workspaceId,
        ]);
    });

    it('joins via chatbots for tenant isolation', async () => {
        const execute = jest.fn().mockResolvedValue([]);
        const repo = buildRepo(execute);

        await repo.getUnreadCounts(operatorId, ['c1'], workspaceId);

        const sql = execute.mock.calls[0][0] as string;
        expect(sql).toContain('JOIN chatbots cb ON cb.id = conv.chatbot_id');
        expect(sql).toContain('cb.workspace_id = ?::uuid');
    });

    it('uses strict-greater date_sent boundary', async () => {
        // Strict `>` intentionally — timestamptz microsecond precision makes
        // same-instant races a non-issue. Documented in repo comment.
        const execute = jest.fn().mockResolvedValue([]);
        const repo = buildRepo(execute);

        await repo.getUnreadCounts(operatorId, ['c1'], workspaceId);

        const sql = execute.mock.calls[0][0] as string;
        expect(sql).toContain('m.date_sent > cr.last_read_at');
        expect(sql).not.toContain('m.date_sent >= cr.last_read_at');
    });

    it('returns a map keyed by conversation id; missing ids are absent', async () => {
        const execute = jest.fn().mockResolvedValue([
            { conversation_id: 'c1', unread_count: '2' },
            { conversation_id: 'c2', unread_count: '7' },
        ]);
        const repo = buildRepo(execute);

        const result = await repo.getUnreadCounts(
            operatorId,
            ['c1', 'c2', 'c3'],
            workspaceId
        );

        expect(result.get('c1')).toBe(2);
        expect(result.get('c2')).toBe(7);
        expect(result.get('c3')).toBeUndefined();
    });
});
