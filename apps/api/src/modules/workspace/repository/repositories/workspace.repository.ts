import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { WorkspaceEntity } from '../entities/workspace.entity';

@Injectable()
export class WorkSpaceRepository extends DatabaseRepository<WorkspaceEntity> {
    constructor(em: EntityManager) {
        super(em, WorkspaceEntity);
    }

    // Method to find workspace with owner populated
    async findWithOwner(id: string) {
        return this.findOne({ id }, { populate: ['owner'] });
    }

    // Method to find workspace with members populated
    async findWithMembers(id: string) {
        return this.findOne({ id }, { populate: ['owner'] });
    }

    // Method to find workspace by slug
    async findBySlug(slug: string) {
        return this.findOne({ slug }, { populate: ['owner'] });
    }

    // Method to find all workspaces by owner
    async findByOwner(ownerId: string) {
        return this.find({ owner: ownerId }, { populate: ['owner'] });
    }
}
