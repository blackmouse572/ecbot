import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { WorkspaceMemberEntity } from '../entities/workspace-member.entity';

@Injectable()
export class WorkspaceMemberRepository extends DatabaseRepository<WorkspaceMemberEntity> {
    constructor(em: EntityManager) {
        super(em, WorkspaceMemberEntity);
    }

    // Method to find active members of a workspace
    async findActiveByWorkspace(workspaceId: string) {
        return this.find(
            { workspace: workspaceId, isActive: true },
            { populate: ['user', 'role', 'workspace'] }
        );
    }

    // Method to find member by workspace and user
    async findByWorkspaceAndUser(workspaceId: string, userId: string) {
        return this.findOne(
            { workspace: workspaceId, user: userId },
            { populate: ['user', 'role', 'workspace'] }
        );
    }

    // Method to find all workspaces for a user
    async findWorkspacesByUser(userId: string) {
        return this.find(
            { user: userId, isActive: true },
            { populate: ['workspace', 'role'] }
        );
    }
}
