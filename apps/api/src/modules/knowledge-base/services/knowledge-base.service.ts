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
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import { KnowledgeBaseEntity } from '../repository/entities/knowledge-base.entity';
import { KnowledgeBaseRepository } from '../repository/repositories/knowledge-base.repository';
import { KnowledgeBaseResponseDto } from '../dtos/response/knowledge-base.response.dto';

@Injectable()
export class KnowledgeBaseService {
    constructor(
        private readonly em: EntityManager,
        private readonly knowledgeBaseRepository: KnowledgeBaseRepository
    ) {}

    async find(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<KnowledgeBaseEntity[]> {
        return this.knowledgeBaseRepository.find(find, options);
    }

    async findAll(workspaceId: string): Promise<KnowledgeBaseEntity[]> {
        return this.knowledgeBaseRepository.findByWorkspace(workspaceId);
    }

    async findAllActive(workspaceId: string): Promise<KnowledgeBaseEntity[]> {
        return this.knowledgeBaseRepository.findActiveByWorkspace(workspaceId);
    }

    async getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        return this.knowledgeBaseRepository.getTotal(find, options);
    }

    async findOneById(
        id: string,
        options?: IDatabaseOptions
    ): Promise<KnowledgeBaseEntity | null> {
        return this.knowledgeBaseRepository.findOneById(id, options);
    }

    async findOne(
        find: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<KnowledgeBaseEntity | null> {
        return this.knowledgeBaseRepository.findOne(find, options);
    }

    async create(
        payload: {
            workspace: string;
            name: string;
            description?: string;
            settings?: Record<string, any>;
        },
        options?: IDatabaseCreateOptions
    ): Promise<KnowledgeBaseEntity> {
        const em = options?.em ?? this.em;

        const knowledgeBase = new KnowledgeBaseEntity();
        knowledgeBase.workspace = em.getReference(
            WorkspaceEntity,
            payload.workspace
        );
        knowledgeBase.name = payload.name;
        knowledgeBase.description = payload.description;
        knowledgeBase.settings = payload.settings;
        knowledgeBase.isActive = true;

        await em.persistAndFlush(knowledgeBase);
        return knowledgeBase;
    }

    async update(
        id: string,
        workspaceId: string,
        payload: {
            name?: string;
            description?: string;
            isActive?: boolean;
            settings?: Record<string, any>;
        },
        options?: IDatabaseUpdateOptions
    ): Promise<KnowledgeBaseEntity> {
        const em = options?.em ?? this.em;

        const knowledgeBase = await em.findOneOrFail(KnowledgeBaseEntity, {
            id,
            workspace: workspaceId,
        });

        if (payload.name !== undefined) {
            knowledgeBase.name = payload.name;
        }
        if (payload.description !== undefined) {
            knowledgeBase.description = payload.description;
        }
        if (payload.isActive !== undefined) {
            knowledgeBase.isActive = payload.isActive;
        }
        if (payload.settings !== undefined) {
            knowledgeBase.settings = payload.settings;
        }

        await em.persist(knowledgeBase).flush();
        return knowledgeBase;
    }

    async softDelete(
        id: string,
        workspaceId: string,
        options?: IDatabaseSoftDeleteOptions
    ): Promise<void> {
        const em = options?.em ?? this.em;

        const knowledgeBase = await em.findOneOrFail(KnowledgeBaseEntity, {
            id,
            workspace: workspaceId,
        });

        knowledgeBase.deletedAt = new Date();
        knowledgeBase.deletedBy = options?.actionBy
            ? em.getReference('UserEntity', options.actionBy)
            : undefined;

        await em.persistAndFlush(knowledgeBase);
    }

    async delete(id: string, options?: IDatabaseDeleteOptions): Promise<void> {
        await this.knowledgeBaseRepository.delete({ id }, options);
    }

    mapGet(data: KnowledgeBaseEntity): KnowledgeBaseResponseDto {
        return plainToInstance(KnowledgeBaseResponseDto, data, {
            excludeExtraneousValues: true,
        });
    }

    mapList(data: KnowledgeBaseEntity[]): KnowledgeBaseResponseDto[] {
        return data.map(item => this.mapGet(item));
    }
}
