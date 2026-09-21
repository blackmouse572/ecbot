import {
    IDatabaseCreateOptions,
    IDatabaseDeleteOptions,
    IDatabaseFindAllOptions,
    IDatabaseGetTotalOptions,
    IDatabaseOptions,
    IDatabaseSoftDeleteOptions,
} from '@app/common/database/interfaces/database.interface';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { UsageEventEntity } from '../repository/entities/usage-event.entity';
import { UsageEventRepository } from '../repository/repositories/usage-event.repository';
import { UsageEventResponseDto } from '../dtos/response/usage-event.response.dto';
import { WorkspaceEntity } from '../../workspace/repository/entities/workspace.entity';
import { UserEntity } from '../../user/repository/entities/user.entity';
import { ENUM_USAGE_EVENT_TYPE } from '../enums/usage-event-type.enum';

@Injectable()
export class UsageEventService {
    constructor(
        private readonly em: EntityManager,
        private readonly usageEventRepository: UsageEventRepository
    ) {}

    async find(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<UsageEventEntity[]> {
        return this.usageEventRepository.find(find, options);
    }

    async getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        return this.usageEventRepository.getTotal(find, options);
    }

    async findOneById(
        id: string,
        options?: IDatabaseOptions
    ): Promise<UsageEventEntity | null> {
        return this.usageEventRepository.findOneById(id, options);
    }

    async findOne(
        find: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<UsageEventEntity | null> {
        return this.usageEventRepository.findOne(find, options);
    }

    async findByWorkspace(
        workspaceId: string,
        options?: IDatabaseFindAllOptions
    ): Promise<UsageEventEntity[]> {
        return this.usageEventRepository.findByWorkspace(workspaceId, options);
    }

    async findByType(
        eventType: ENUM_USAGE_EVENT_TYPE,
        options?: IDatabaseFindAllOptions
    ): Promise<UsageEventEntity[]> {
        return this.usageEventRepository.find(
            {
                eventType,
            },
            options
        );
    }

    async create(
        payload: {
            workspace: string;
            eventType: ENUM_USAGE_EVENT_TYPE;
            amount: number;
            source: string;
            metadata?: Record<string, any>;
            userId?: string;
        },
        options?: IDatabaseCreateOptions
    ): Promise<UsageEventEntity> {
        const em = options?.em ?? this.em;

        const event = new UsageEventEntity();
        event.workspace = em.getReference(WorkspaceEntity, payload.workspace);
        event.eventType = payload.eventType;
        event.amount = payload.amount;
        event.source = payload.source;
        event.metadata = payload.metadata;
        if (payload.userId) {
            event.user = em.getReference(UserEntity, payload.userId);
        }

        await em.persist(event).flush();
        return event;
    }

    async getTotalUsageByType(
        workspaceId: string,
        eventType: ENUM_USAGE_EVENT_TYPE
    ): Promise<number> {
        return this.usageEventRepository.getTotalUsageByType(
            workspaceId,
            eventType
        );
    }

    async getAggregatedUsage(
        workspaceId: string
    ): Promise<Record<string, any>> {
        const tokenTotal = await this.getTotalUsageByType(
            workspaceId,
            ENUM_USAGE_EVENT_TYPE.TOKEN_USED
        );
        const storageTotal = await this.getTotalUsageByType(
            workspaceId,
            ENUM_USAGE_EVENT_TYPE.STORAGE_ADDED
        );
        const processedTotal = await this.getTotalUsageByType(
            workspaceId,
            ENUM_USAGE_EVENT_TYPE.DOCUMENT_PROCESSED
        );

        return {
            tokenUsage: tokenTotal,
            storageUsage: storageTotal,
            documentsProcessed: processedTotal,
            timestamp: new Date(),
        };
    }

    async softDelete(
        id: string,
        options?: IDatabaseSoftDeleteOptions
    ): Promise<void> {
        const em = options?.em ?? this.em;

        const event = await em.findOneOrFail(UsageEventEntity, id);

        event.deletedAt = new Date();
        event.deletedBy = options?.actionBy
            ? em.getReference('UserEntity', options.actionBy)
            : undefined;

        await em.persist(event).flush();
    }

    async delete(id: string, options?: IDatabaseDeleteOptions): Promise<void> {
        await this.usageEventRepository.delete({ id }, options);
    }

    mapGet(data: UsageEventEntity): UsageEventResponseDto {
        return plainToInstance(UsageEventResponseDto, data, {
            excludeExtraneousValues: true,
        });
    }

    mapList(data: UsageEventEntity[]): UsageEventResponseDto[] {
        return data.map(item => this.mapGet(item));
    }
}
