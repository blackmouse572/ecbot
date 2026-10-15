import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { WorkspaceEntity } from '../entities/workspace.entity';
import { IWorkspaceRelatedCounts } from '../../interfaces/workspace.admin.interface';

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

    /** Active members and chatbots per workspace, keyed by workspace id. */
    async countMembersAndChatbots(
        workspaceIds: string[]
    ): Promise<Map<string, IWorkspaceRelatedCounts>> {
        if (workspaceIds.length === 0) return new Map();

        const rows: {
            id: string;
            member_count: string;
            chatbot_count: string;
        }[] = await this.em.getConnection().execute(
            `
            SELECT
                w.id,
                (SELECT COUNT(*) FROM workspace_members m
                    WHERE m.workspace_id = w.id
                        AND m.deleted = false
                        AND m.is_active = true) AS member_count,
                (SELECT COUNT(*) FROM chatbots c
                    WHERE c.workspace_id = w.id
                        AND c.deleted = false) AS chatbot_count
            FROM workspaces w
            WHERE w.id IN (?)
            `,
            [workspaceIds]
        );

        return new Map(
            rows.map(row => [
                row.id,
                {
                    memberCount: Number(row.member_count),
                    chatbotCount: Number(row.chatbot_count),
                },
            ])
        );
    }
}
