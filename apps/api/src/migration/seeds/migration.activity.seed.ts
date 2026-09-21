import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { ENUM_ACTIVITY_ACTION } from 'src/modules/activity/enums/activity.enum';
import { ActivityEntity } from 'src/modules/activity/repository/entities/activity.entity';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { WorkspaceEntity } from 'src/modules/workspace/repository/entities/workspace.entity';

@Injectable()
export class MigrationActivitySeed {
    constructor(private readonly em: EntityManager) {}

    async seeds(): Promise<void> {
        // Find test users and workspaces for activity creation
        const users = await this.em.find(UserEntity, {}, { limit: 3 });
        const workspaces = await this.em.find(
            WorkspaceEntity,
            {},
            { limit: 2 }
        );

        if (users.length === 0 || workspaces.length === 0) {
            console.log(
                'No users or workspaces found for activity seeding. Please seed users and workspaces first.'
            );
            return;
        }

        const activityData = [
            {
                action: ENUM_ACTIVITY_ACTION.CREATE,
                description: 'User created a new workspace',
                by: users[0],
                user: users[0],
                workspace: workspaces[0],
                metadata: {
                    entity: 'workspace',
                    entityId: workspaces[0].id,
                    details: 'Created Ecbot Development workspace',
                },
            },
            {
                action: ENUM_ACTIVITY_ACTION.UPDATE,
                description: 'User updated their profile',
                by: users[1],
                user: users[1],
                workspace: workspaces[0],
                metadata: {
                    entity: 'user',
                    entityId: users[1].id,
                    details: 'Updated profile information',
                },
            },
            {
                action: ENUM_ACTIVITY_ACTION.DELETE,
                description: 'Admin deleted inactive workspace',
                by: users[0],
                user: users[2],
                workspace: workspaces[1],
                metadata: {
                    entity: 'workspace',
                    entityId: workspaces[1].id,
                    details: 'Deleted inactive Customer Support workspace',
                },
            },
            {
                action: ENUM_ACTIVITY_ACTION.JOIN_WORKSPACE,
                description: 'User joined the workspace',
                by: users[1],
                user: users[1],
                metadata: {
                    entity: 'auth',
                    details: 'Successful login and workspace join',
                    ip: '192.168.1.100',
                },
            },
            {
                action: ENUM_ACTIVITY_ACTION.LEAVE_WORKSPACE,
                description: 'User left the workspace',
                by: users[2],
                user: users[2],
                metadata: {
                    entity: 'auth',
                    details: 'User left workspace',
                    ip: '192.168.1.102',
                },
            },
        ];

        for (const activityDataItem of activityData) {
            const activity = this.em.create(ActivityEntity, activityDataItem);
            this.em.persist(activity);
        }

        await this.em.flush();
    }

    async remove(): Promise<void> {
        await this.em.nativeDelete(ActivityEntity, {});
    }
}
