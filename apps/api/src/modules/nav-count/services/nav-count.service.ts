import { AccountRepository } from '@app/modules/account/repository/repositories/account.repository';
import { CustomerMergeSuggestionRepository } from '@app/modules/customer/repository/repositories/customer-merge-suggestion.repository';
import { ToolRepository } from '@app/modules/tool/repository/repositories/tool.repository';
import { Injectable } from '@nestjs/common';

export interface INavCounts {
    pendingSuggestions: number;
    accountsNeedingAttention: number;
    toolsNeedingAttention: number;
}

/**
 * Aggregates the "needs attention" counts surfaced as nav badges for a
 * workspace: pending customer-merge suggestions, blocked accounts, and tools
 * whose connection is broken (re-auth / expired / revoked).
 */
@Injectable()
export class NavCountService {
    constructor(
        private readonly suggestionRepository: CustomerMergeSuggestionRepository,
        private readonly accountRepository: AccountRepository,
        private readonly toolRepository: ToolRepository
    ) {}

    async getWorkspaceCounts(workspaceId: string): Promise<INavCounts> {
        // Display-only badge: a single failing count must not 500 the whole
        // response, so settle independently and fall back to 0 per section.
        const [pending, accounts, tools] = await Promise.allSettled([
            this.suggestionRepository.countPendingByWorkspace(workspaceId),
            this.accountRepository.countNeedingAttentionByWorkspace(
                workspaceId
            ),
            this.toolRepository.countNeedingAttentionByWorkspace(workspaceId),
        ]);

        const valueOf = (result: PromiseSettledResult<number>): number =>
            result.status === 'fulfilled' ? result.value : 0;

        return {
            pendingSuggestions: valueOf(pending),
            accountsNeedingAttention: valueOf(accounts),
            toolsNeedingAttention: valueOf(tools),
        };
    }
}
