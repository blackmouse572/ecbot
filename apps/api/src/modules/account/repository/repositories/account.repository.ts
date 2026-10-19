import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { EntityManager } from '@mikro-orm/postgresql';
import { ConflictException, Injectable } from '@nestjs/common';
import {
    ENUM_ACCOUNT_STATUS,
    ENUM_ACCOUNT_TYPE,
} from '../../enums/account.enum';
import { ENUM_ACCOUNT_STATUS_CODE_ERROR } from '../../enums/account.status-code.enum';
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
    // connections, or ones whose sends keep failing. INACTIVE is a normal
    // disconnected state, not an alert.
    async countNeedingAttentionByWorkspace(
        workspaceId: string
    ): Promise<number> {
        return this.getTotal({
            workspace: workspaceId,
            $or: [
                { status: ENUM_ACCOUNT_STATUS.BLOCKED },
                { sendFailingSince: { $ne: null } },
            ],
            deletedAt: null,
        });
    }

    /** Record a failing channel; the start time is kept if already failing. */
    async markSendFailing(
        id: string,
        since: Date,
        lastSendError: string
    ): Promise<void> {
        await this.updateRaw(
            { id },
            { sendFailingSince: since, lastSendError }
        );
    }

    async clearSendFailing(id: string): Promise<void> {
        await this.updateRaw(
            { id },
            { sendFailingSince: null, lastSendError: null }
        );
    }

    /**
     * Accounts whose token expires within `thresholdMinutes`, plus those of
     * the `early` types within its longer window (for platforms that refuse
     * to refresh an already expired token).
     */
    async findExpiringSoon(
        thresholdMinutes: number = 30,
        early?: { types: ENUM_ACCOUNT_TYPE[]; minutes: number }
    ): Promise<AccountEntity[]> {
        const ahead = (minutes: number) =>
            new Date(Date.now() + minutes * 60 * 1000);
        const windows: Record<string, unknown>[] = [
            { tokenExpiresAt: { $lte: ahead(thresholdMinutes) } },
        ];
        if (early?.types.length) {
            windows.push({
                type: { $in: early.types },
                tokenExpiresAt: { $lte: ahead(early.minutes) },
            });
        }
        return this.find({
            $or: windows,
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

        // Same externalId re-linking under a different workspace would move
        // the account (and its conversation history) between tenants — block
        // it instead of silently reassigning ownership.
        const incomingWorkspaceId =
            (data.workspace as { id?: string } | undefined)?.id ??
            (data.workspace as unknown as string | undefined);
        if (
            incomingWorkspaceId &&
            existing.workspace?.id &&
            existing.workspace.id !== incomingWorkspaceId
        ) {
            throw new ConflictException({
                statusCode: ENUM_ACCOUNT_STATUS_CODE_ERROR.WORKSPACE_MISMATCH,
                message: 'account.error.workspaceMismatch',
            });
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
