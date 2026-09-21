import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { ENUM_ACCOUNT_STATUS } from '../../enums/account.enum';
import { AccountEntity } from '../entities/account.entity';
import { IDatabaseCreateOptions } from '../../../../common/database/interfaces/database.interface';

const WORKSPACE_LIST_POPULATE = ['workspace', 'addedBy'];

@Injectable()
export class AccountRepository extends DatabaseRepository<AccountEntity> {
    constructor(em: EntityManager) {
        super(em, AccountEntity);
    }

    async findByName(name: string): Promise<AccountEntity | null> {
        return this.findOne({ name });
    }

    async findBySlug(slug: string): Promise<AccountEntity | null> {
        return this.findOne({ slug });
    }

    async findByWorkspace(workspaceId: string): Promise<AccountEntity[]> {
        return this.find(
            { workspace: workspaceId },
            { populate: WORKSPACE_LIST_POPULATE }
        );
    }

    async findActiveByWorkspace(workspaceId: string): Promise<AccountEntity[]> {
        return this.find(
            { workspace: workspaceId, status: ENUM_ACCOUNT_STATUS.ACTIVE },
            { populate: WORKSPACE_LIST_POPULATE }
        );
    }

    // Accounts needing operator attention: blocked (suspended/banned/errored)
    // connections. INACTIVE is a normal disconnected state, not an alert.
    async countNeedingAttentionByWorkspace(
        workspaceId: string
    ): Promise<number> {
        return this.getTotal({
            workspace: workspaceId,
            status: ENUM_ACCOUNT_STATUS.BLOCKED,
            deletedAt: null,
        });
    }

    async findExpiringSoon(
        thresholdMinutes: number = 30
    ): Promise<AccountEntity[]> {
        const threshold = new Date(Date.now() + thresholdMinutes * 60 * 1000);
        return this.find({
            tokenExpiresAt: { $lte: threshold },
            status: { $ne: ENUM_ACCOUNT_STATUS.BLOCKED },
            deletedAt: null,
        });
    }

    async findAllActive(): Promise<AccountEntity[]> {
        return this.find({
            status: ENUM_ACCOUNT_STATUS.ACTIVE,
            deletedAt: null,
        });
    }

    /**
     * Create or refresh the row for `data.externalId`.
     *
     * @param actionBy id of the acting user, recorded on the audit columns
     */
    async upsert(
        data: Partial<AccountEntity>,
        actionBy?: any,
        options?: IDatabaseCreateOptions
    ): Promise<AccountEntity> {
        if (!data.externalId) {
            throw new Error('externalId is required for account upsert');
        }

        const existing = await this.findOne({ externalId: data.externalId });

        if (!existing) {
            const created = this.em.create(AccountEntity, data, options);
            this.stamp(created, 'createdBy', actionBy);
            this.stamp(created, 'updatedBy', actionBy);
            await this.em.persistAndFlush(created);
            return created;
        }

        // Relinking an externalId revives the row: unlinking an account that
        // still had conversation history only soft-deleted it, and the same
        // externalId coming back means the channel is live again.
        Object.assign(existing, data);
        existing.deletedAt = null;
        this.stamp(existing, 'updatedBy', actionBy);
        this.stamp(existing, 'updatedAt', new Date());
        await this.em.persistAndFlush(existing);
        return existing;
    }

    /**
     * Write an audit column only when it exists on the target — callers hand
     * in partial rows, and a missing column must stay missing.
     */
    private stamp(
        account: AccountEntity,
        column: string,
        value: unknown
    ): void {
        if (value && column in account) {
            (account as Record<string, any>)[column] = value;
        }
    }
}
