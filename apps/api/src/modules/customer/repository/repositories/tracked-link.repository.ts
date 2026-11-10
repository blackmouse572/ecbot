import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from '@app/common/pagination/enums/pagination.enum';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
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

    async findChildren(parentId: string): Promise<TrackedLinkEntity[]> {
        return this.find(
            { parent: parentId, deletedAt: null },
            {
                populate: ['account'],
                order: { createdAt: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.ASC },
            }
        );
    }

    /** Codes in the workspace that start with `prefix`, to pick a free one. */
    async findCodesStartingWith(
        workspaceId: string,
        prefix: string
    ): Promise<string[]> {
        const rows = await this.find({
            workspace: workspaceId,
            code: { $like: `${prefix}%` },
        });

        return rows.map(row => row.code);
    }
}
