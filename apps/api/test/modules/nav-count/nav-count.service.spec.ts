import { NavCountService } from '@app/modules/nav-count/services/nav-count.service';

describe('NavCountService', () => {
    it('aggregates the three workspace nav counts in one shape', async () => {
        const suggestionRepo = {
            countPendingByWorkspace: jest.fn().mockResolvedValue(3),
        };
        const accountRepo = {
            countNeedingAttentionByWorkspace: jest.fn().mockResolvedValue(2),
        };
        const toolRepo = {
            countNeedingAttentionByWorkspace: jest.fn().mockResolvedValue(1),
        };

        const service = new NavCountService(
            suggestionRepo as any,
            accountRepo as any,
            toolRepo as any
        );

        const result = await service.getWorkspaceCounts('ws-1');

        expect(result).toEqual({
            pendingSuggestions: 3,
            accountsNeedingAttention: 2,
            toolsNeedingAttention: 1,
        });
        expect(suggestionRepo.countPendingByWorkspace).toHaveBeenCalledWith(
            'ws-1'
        );
        expect(
            accountRepo.countNeedingAttentionByWorkspace
        ).toHaveBeenCalledWith('ws-1');
        expect(toolRepo.countNeedingAttentionByWorkspace).toHaveBeenCalledWith(
            'ws-1'
        );
    });

    it('falls back to 0 for a section whose count query fails', async () => {
        const service = new NavCountService(
            { countPendingByWorkspace: jest.fn().mockResolvedValue(3) } as any,
            {
                countNeedingAttentionByWorkspace: jest
                    .fn()
                    .mockRejectedValue(new Error('db down')),
            } as any,
            {
                countNeedingAttentionByWorkspace: jest
                    .fn()
                    .mockResolvedValue(1),
            } as any
        );

        const result = await service.getWorkspaceCounts('ws-1');

        expect(result).toEqual({
            pendingSuggestions: 3,
            accountsNeedingAttention: 0,
            toolsNeedingAttention: 1,
        });
    });
});
