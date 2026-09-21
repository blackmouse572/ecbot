import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { RoleEntity } from 'src/modules/role/repository/entities/role.entity';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { WorkspaceMemberEntity } from 'src/modules/workspace/repository/entities/workspace-member.entity';
import { WorkspaceEntity } from 'src/modules/workspace/repository/entities/workspace.entity';

@Injectable()
export class MigrationWorkspaceSeed {
    constructor(private readonly em: EntityManager) {}

    async seeds(): Promise<void> {
        // Find test users and roles for workspace creation
        const users = await this.em.find(UserEntity, {}, { limit: 3 });
        const adminRole = await this.em.findOne(RoleEntity, { name: 'admin' });
        const userRole = await this.em.findOne(RoleEntity, {
            name: 'individual',
        });

        if (users.length === 0 || !adminRole || !userRole) {
            console.log(
                'No users or roles found for workspace seeding. Please seed users and roles first.'
            );
            return;
        }

        const workspaceData = [
            {
                name: 'Ecbot Development',
                slug: 'eccho-dev',
                description: 'Main development workspace for Ecbot platform',
                owner: users[0],
                isActive: true,
                metadata: {
                    features: ['chat', 'analytics', 'integrations'],
                    plan: 'enterprise',
                    maxMembers: 100,
                },
            },
            {
                name: 'Marketing Team',
                slug: 'marketing-team',
                description: 'Marketing and content creation workspace',
                owner: users[1],
                isActive: true,
                metadata: {
                    features: ['chat', 'analytics'],
                    plan: 'professional',
                    maxMembers: 25,
                },
            },
            {
                name: 'Customer Support',
                slug: 'customer-support',
                description: 'Customer support and service workspace',
                owner: users[2],
                isActive: false,
                metadata: {
                    features: ['chat'],
                    plan: 'basic',
                    maxMembers: 10,
                },
            },
        ];

        const workspaces: WorkspaceEntity[] = [];
        for (const workspaceDataItem of workspaceData) {
            const workspace = this.em.create(
                WorkspaceEntity,
                workspaceDataItem
            );
            this.em.persist(workspace);
            workspaces.push(workspace);
        }

        await this.em.flush();

        // Create workspace members
        const memberData = [
            // Workspace 1 members
            {
                workspace: workspaces[0],
                user: users[0],
                role: adminRole,
                isActive: true,
                joinedAt: new Date(),
            },
            {
                workspace: workspaces[0],
                user: users[1],
                role: userRole,
                isActive: true,
                joinedAt: new Date(),
            },
            // Workspace 2 members
            {
                workspace: workspaces[1],
                user: users[1],
                role: adminRole,
                isActive: true,
                joinedAt: new Date(),
            },
            {
                workspace: workspaces[1],
                user: users[2],
                role: userRole,
                isActive: true,
                joinedAt: new Date(),
            },
            // Workspace 3 members
            {
                workspace: workspaces[2],
                user: users[2],
                role: adminRole,
                isActive: false,
                joinedAt: new Date(),
                leftAt: new Date(),
            },
        ];

        for (const memberDataItem of memberData) {
            const member = this.em.create(
                WorkspaceMemberEntity,
                memberDataItem
            );
            this.em.persist(member);
        }

        await this.em.flush();
    }

    async remove(): Promise<void> {
        await this.em.nativeDelete(WorkspaceMemberEntity, {});
        await this.em.nativeDelete(WorkspaceEntity, {});
    }
}
