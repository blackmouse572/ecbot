import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { WorkspaceUsageEntity } from '../entities/workspace-usage.entity';
import { IDatabaseUpdateOptions } from '../../../../common/database/interfaces/database.interface';
import { WorkspaceEntity } from '../../../workspace/repository/entities/workspace.entity';

@Injectable()
export class WorkspaceUsageRepository extends DatabaseRepository<WorkspaceUsageEntity> {
    constructor(em: EntityManager) {
        super(em, WorkspaceUsageEntity);
    }

    async findByWorkspace(workspaceId: string) {
        return this.findOne(
            { workspace: workspaceId, deletedAt: null },
            { populate: ['workspace'] }
        );
    }

    async getOrCreateByWorkspace(workspaceId: string) {
        let usage = await this.findByWorkspace(workspaceId);

        if (!usage) {
            usage = new WorkspaceUsageEntity();
            usage.workspace = this.em.getReference(
                WorkspaceEntity,
                workspaceId
            );
            usage.storageUsage = 0;
            usage.tokenUsage = 0;
            usage.documentsCount = 0;
            await this.em.persist(usage).flush();
        }

        return usage;
    }

    async updateStorageUsage(
        workspaceId: string,
        deltaBytessize: number,
        options?: IDatabaseUpdateOptions
    ) {
        const em = options?.em ?? this.em;
        const usage = await this.getOrCreateByWorkspace(workspaceId);
        usage.storageUsage = Math.max(0, usage.storageUsage + deltaBytessize);
        usage.updatedAt = new Date();
        await em.flush();
        return usage;
    }

    async updateTokenUsage(
        workspaceId: string,
        tokens: number,
        options?: IDatabaseUpdateOptions
    ) {
        const em = options?.em ?? this.em;
        const usage = await this.getOrCreateByWorkspace(workspaceId);
        usage.tokenUsage += tokens;
        usage.updatedAt = new Date();
        await em.flush();
        return usage;
    }

    async updateDocumentCount(
        workspaceId: string,
        delta: number,
        options?: IDatabaseUpdateOptions
    ) {
        const em = options?.em ?? this.em;
        const usage = await this.getOrCreateByWorkspace(workspaceId);
        usage.documentsCount = Math.max(0, usage.documentsCount + delta);
        usage.updatedAt = new Date();
        await em.flush();
        return usage;
    }

    async updateMetrics(
        workspaceId: string,
        metrics: Record<string, any>,
        options?: IDatabaseUpdateOptions
    ) {
        const em = options?.em ?? this.em;
        const usage = await this.getOrCreateByWorkspace(workspaceId);
        usage.metrics = {
            ...(usage.metrics || {}),
            ...metrics,
        };
        usage.updatedAt = new Date();
        await em.flush();
        return usage;
    }
}
