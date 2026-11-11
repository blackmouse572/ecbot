import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from '@app/common/pagination/enums/pagination.enum';
import { AccountEntity } from '@app/modules/account/repository/entities/account.entity';
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { ITrackedLinkCreate } from '../../interfaces/tracked-link.interface';
import { TrackedLinkEntity } from '../entities/tracked-link.entity';

@Injectable()
export class TrackedLinkRepository extends DatabaseRepository<TrackedLinkEntity> {
    constructor(em: EntityManager) {
        super(em, TrackedLinkEntity);
    }

    async findInWorkspace(
        id: string,
        workspaceId: string
    ): Promise<TrackedLinkEntity | null> {
        return this.findOne(
            { id, workspace: workspaceId, deletedAt: null },
            { populate: ['account'] }
        );
    }

    /** The live QR and KOL codes of one source, or of several. */
    async findChildren(
        parentIds: string | string[]
    ): Promise<TrackedLinkEntity[]> {
        return this.find(
            {
                parent: { $in: ([] as string[]).concat(parentIds) },
                deletedAt: null,
            },
            {
                populate: ['account'],
                order: { createdAt: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.ASC },
            }
        );
    }

    /**
     * Inserts a link and returns it with its account loaded. The insert runs
     * in its own fork, so a unique violation on the code leaves nothing
     * behind in this unit of work and the caller can retry with a new code.
     */
    async createLink({
        workspaceId,
        accountId,
        parentId,
        ...fields
    }: ITrackedLinkCreate): Promise<TrackedLinkEntity> {
        const em = this.em.fork();
        const link = await this.create(
            {
                ...fields,
                workspace: em.getReference(WorkspaceEntity, workspaceId),
                account: em.getReference(AccountEntity, accountId),
                parent: parentId
                    ? em.getReference(TrackedLinkEntity, parentId)
                    : null,
            },
            { em }
        );

        return this.em.findOneOrFail(
            TrackedLinkEntity,
            { id: link.id },
            { populate: ['account'] }
        );
    }

    /** Codes in the workspace that start with `prefix`, to pick a free one.
     *  Deleted links count: the unique index still holds their codes. */
    async findCodesStartingWith(
        workspaceId: string,
        prefix: string
    ): Promise<string[]> {
        const rows = await this.em.find(
            TrackedLinkEntity,
            { workspace: workspaceId, code: { $like: `${prefix}%` } },
            { fields: ['code'] }
        );

        return rows.map(row => row.code);
    }
}
