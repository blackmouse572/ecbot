import {
    IDatabaseCreateOptions,
    IDatabaseDeleteOptions,
    IDatabaseFindAllOptions,
    IDatabaseGetTotalOptions,
    IDatabaseOptions,
    IDatabaseSoftDeleteOptions,
    IDatabaseUpdateOptions,
} from '@app/common/database/interfaces/database.interface';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { WorkspaceUsageEntity } from '../repository/entities/workspace-usage.entity';
import { WorkspaceUsageRepository } from '../repository/repositories/workspace-usage.repository';
import { WorkspaceUsageResponseDto } from '../dtos/response/workspace-usage.response.dto';
import { WorkspaceEntity } from '../../workspace/repository/entities/workspace.entity';

@Injectable()
export class WorkspaceUsageService {
    constructor(
        private readonly em: EntityManager,
        private readonly workspaceUsageRepository: WorkspaceUsageRepository
    ) {}

    async find(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<WorkspaceUsageEntity[]> {
        return this.workspaceUsageRepository.find(find, options);
    }

    async getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        return this.workspaceUsageRepository.getTotal(find, options);
    }

    async findOneById(
        id: string,
        options?: IDatabaseOptions
    ): Promise<WorkspaceUsageEntity | null> {
        return this.workspaceUsageRepository.findOneById(id, options);
    }

    async findOne(
        find: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<WorkspaceUsageEntity | null> {
        return this.workspaceUsageRepository.findOne(find, options);
    }

    async getByWorkspace(workspaceId: string): Promise<WorkspaceUsageEntity> {
        return this.workspaceUsageRepository.getOrCreateByWorkspace(
            workspaceId
        );
    }

    async create(
        payload: {
            workspace: string;
            tokenUsage?: number;
            storageUsage?: number;
            documentsCount?: number;
            metrics?: Record<string, any>;
        },
        options?: IDatabaseCreateOptions
    ): Promise<WorkspaceUsageEntity> {
        const em = options?.em ?? this.em;

        const usage = new WorkspaceUsageEntity();
        usage.workspace = em.getReference(WorkspaceEntity, payload.workspace);
        usage.tokenUsage = payload.tokenUsage ?? 0;
        usage.storageUsage = payload.storageUsage ?? 0;
        usage.documentsCount = payload.documentsCount ?? 0;
        usage.metrics = payload.metrics;

        await em.persist(usage).flush();
        return usage;
    }

    async update(
        id: string,
        payload: {
            tokenUsage?: number;
            storageUsage?: number;
            documentsCount?: number;
            metrics?: Record<string, any>;
        },
        options?: IDatabaseUpdateOptions
    ): Promise<WorkspaceUsageEntity> {
        const em = options?.em ?? this.em;

        const usage = await em.findOneOrFail(WorkspaceUsageEntity, id);

        if (payload.tokenUsage !== undefined) {
            usage.tokenUsage = payload.tokenUsage;
        }
        if (payload.storageUsage !== undefined) {
            usage.storageUsage = payload.storageUsage;
        }
        if (payload.documentsCount !== undefined) {
            usage.documentsCount = payload.documentsCount;
        }
        if (payload.metrics !== undefined) {
            usage.metrics = payload.metrics;
        }

        usage.updatedAt = new Date();
        await em.persist(usage).flush();
        return usage;
    }

    async updateStorageUsage(
        workspaceId: string,
        delta: number,
        options?: IDatabaseUpdateOptions
    ): Promise<WorkspaceUsageEntity> {
        const em = options?.em ?? this.em;
        return this.workspaceUsageRepository.updateStorageUsage(
            workspaceId,
            delta,
            { em }
        );
    }

    async updateTokenUsage(
        workspaceId: string,
        delta: number,
        options?: IDatabaseUpdateOptions
    ): Promise<WorkspaceUsageEntity> {
        const em = options?.em ?? this.em;
        return this.workspaceUsageRepository.updateTokenUsage(
            workspaceId,
            delta,
            { em }
        );
    }

    async updateDocumentCount(
        workspaceId: string,
        delta: number,
        options?: IDatabaseUpdateOptions
    ): Promise<WorkspaceUsageEntity> {
        const em = options?.em ?? this.em;
        return this.workspaceUsageRepository.updateDocumentCount(
            workspaceId,
            delta,
            { em }
        );
    }

    async softDelete(
        id: string,
        options?: IDatabaseSoftDeleteOptions
    ): Promise<void> {
        const em = options?.em ?? this.em;

        const usage = await em.findOneOrFail(WorkspaceUsageEntity, id);

        usage.deletedAt = new Date();
        usage.deletedBy = options?.actionBy
            ? em.getReference('UserEntity', options.actionBy)
            : undefined;

        await em.persistAndFlush(usage);
    }

    async delete(id: string, options?: IDatabaseDeleteOptions): Promise<void> {
        await this.workspaceUsageRepository.delete({ id }, options);
    }

    mapGet(data: WorkspaceUsageEntity): WorkspaceUsageResponseDto {
        return plainToInstance(WorkspaceUsageResponseDto, data, {
            excludeExtraneousValues: true,
        });
    }

    mapList(data: WorkspaceUsageEntity[]): WorkspaceUsageResponseDto[] {
        return data.map(item => this.mapGet(item));
    }
}
