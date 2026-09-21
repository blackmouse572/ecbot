import { AccountRepository } from '@app/modules/account/repository/repositories/account.repository';
import { ENUM_ACCOUNT_STATUS } from '@app/modules/account/enums/account.enum';
import { CustomerMergeSuggestionRepository } from '@app/modules/customer/repository/repositories/customer-merge-suggestion.repository';
import { ENUM_CUSTOMER_MERGE_SUGGESTION_STATUS } from '@app/modules/customer/enums/customer.enum';
import { ToolRepository } from '@app/modules/tool/repository/repositories/tool.repository';
import { ENUM_TOOL_STATUS } from '@app/modules/tool/enums/tool-status.enum';

describe('nav-count repository counters', () => {
    it('counts only PENDING merge suggestions for the workspace', async () => {
        const getTotal = jest.fn().mockResolvedValue(4);
        const repo = Object.create(
            CustomerMergeSuggestionRepository.prototype
        ) as any;
        repo.getTotal = getTotal;

        await expect(repo.countPendingByWorkspace('ws-1')).resolves.toBe(4);
        expect(getTotal).toHaveBeenCalledWith({
            workspace: 'ws-1',
            status: ENUM_CUSTOMER_MERGE_SUGGESTION_STATUS.PENDING,
            deletedAt: null,
        });
    });

    it('counts only BLOCKED accounts for the workspace', async () => {
        const getTotal = jest.fn().mockResolvedValue(2);
        const repo = Object.create(AccountRepository.prototype) as any;
        repo.getTotal = getTotal;

        await expect(
            repo.countNeedingAttentionByWorkspace('ws-1')
        ).resolves.toBe(2);
        expect(getTotal).toHaveBeenCalledWith({
            workspace: 'ws-1',
            status: ENUM_ACCOUNT_STATUS.BLOCKED,
            deletedAt: null,
        });
    });

    it('counts tools in a broken-connection status for the workspace', async () => {
        const countAll = jest.fn().mockResolvedValue(1);
        const repo = Object.create(ToolRepository.prototype) as any;
        repo.countAll = countAll;

        await expect(
            repo.countNeedingAttentionByWorkspace('ws-1')
        ).resolves.toBe(1);
        expect(countAll).toHaveBeenCalledWith({
            workspace: { id: 'ws-1' },
            status: {
                $in: [
                    ENUM_TOOL_STATUS.NEEDS_REAUTH,
                    ENUM_TOOL_STATUS.EXPIRED,
                    ENUM_TOOL_STATUS.REVOKED,
                ],
            },
        });
    });
});
