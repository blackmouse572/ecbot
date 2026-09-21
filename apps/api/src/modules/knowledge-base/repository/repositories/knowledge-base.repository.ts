import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { KnowledgeBaseEntity } from '../entities/knowledge-base.entity';

@Injectable()
export class KnowledgeBaseRepository extends DatabaseRepository<KnowledgeBaseEntity> {
    constructor(em: EntityManager) {
        super(em, KnowledgeBaseEntity);
    }

    async findByWorkspace(workspaceId: string) {
        return this.find(
            { workspace: workspaceId, deletedAt: null },
            {
                populate: ['workspace'],
                orderBy: { createdAt: 'DESC' },
            }
        );
    }

    async findActiveByWorkspace(workspaceId: string) {
        return this.find(
            { workspace: workspaceId, isActive: true, deletedAt: null },
            {
                populate: ['workspace'],
                orderBy: { createdAt: 'DESC' },
            }
        );
    }

    async findByWorkspaceAndName(workspaceId: string, name: string) {
        return this.findOne(
            { workspace: workspaceId, name, deletedAt: null },
            { populate: ['workspace'] }
        );
    }
}
