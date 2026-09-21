import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { ENUM_USAGE_EVENT_TYPE } from '../../enums/usage-event-type.enum';
import { UsageEventEntity } from '../entities/usage-event.entity';
import { IDatabaseFindAllOptions } from '../../../../common/database/interfaces/database.interface';

@Injectable()
export class UsageEventRepository extends DatabaseRepository<UsageEventEntity> {
    constructor(em: EntityManager) {
        super(em, UsageEventEntity);
    }

    async findByWorkspace(
        workspaceId: string,
        options?: IDatabaseFindAllOptions
    ) {
        return this.find(
            { workspace: workspaceId, deletedAt: null },
            {
                ...options,
                populate: ['workspace', 'user'],
                orderBy: { createdAt: 'DESC' },
            }
        );
    }

    async findByWorkspaceAndType(
        workspaceId: string,
        eventType: ENUM_USAGE_EVENT_TYPE,
        limit = 100,
        offset = 0
    ) {
        return this.find(
            { workspace: workspaceId, eventType, deletedAt: null },
            {
                populate: ['workspace', 'user'],
                orderBy: { createdAt: 'DESC' },
                limit,
                offset,
            }
        );
    }

    async countByWorkspace(workspaceId: string) {
        return this.em.count(UsageEventEntity, {
            workspace: workspaceId,
            deletedAt: null,
        });
    }

    async getTotalUsageByType(
        workspaceId: string,
        eventType: ENUM_USAGE_EVENT_TYPE
    ): Promise<number> {
        const events = await this.find(
            { workspace: workspaceId, eventType, deletedAt: null },
            { populate: [] }
        );
        return events.reduce((total, event) => total + event.amount, 0);
    }

    async getUsageBySource(
        workspaceId: string,
        source: string
    ): Promise<{ [key in ENUM_USAGE_EVENT_TYPE]: number }> {
        const events = await this.find(
            { workspace: workspaceId, source, deletedAt: null },
            { populate: [] }
        );

        const result = {
            [ENUM_USAGE_EVENT_TYPE.STORAGE_ADDED]: 0,
            [ENUM_USAGE_EVENT_TYPE.STORAGE_REMOVED]: 0,
            [ENUM_USAGE_EVENT_TYPE.TOKEN_USED]: 0,
            [ENUM_USAGE_EVENT_TYPE.DOCUMENT_PROCESSED]: 0,
        };

        for (const event of events) {
            result[event.eventType] += event.amount;
        }

        return result;
    }
}
