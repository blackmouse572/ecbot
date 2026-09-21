import { ENUM_INVITATION_STATUS } from '@app/modules/invitation/enums/invitation.enum';
import { InvitationEntity } from '@app/modules/invitation/repository/entities/invitation.entity';
import { RoleEntity } from '@app/modules/role/repository/entities/role.entity';
import { UserEntity } from '@app/modules/user/repository/entities/user.entity';
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import { faker } from '@faker-js/faker';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MigrationInvitationSeed {
    constructor(private readonly em: EntityManager) {}

    async run(): Promise<void> {
        // Get existing workspaces, users, and roles
        const workspaces = await this.em.find(
            WorkspaceEntity,
            {},
            { limit: 5 }
        );
        const users = await this.em.find(UserEntity, {}, { limit: 10 });
        const roles = await this.em.find(RoleEntity, {}, { limit: 3 });

        if (workspaces.length === 0 || users.length === 0) {
            console.log(
                '⚠️  Skipping invitation seeding - requires workspaces and users'
            );
            return;
        }

        const invitations: Partial<InvitationEntity>[] = [];

        // Create pending invitations
        for (let i = 0; i < 4; i++) {
            const workspace = faker.helpers.arrayElement(workspaces);
            const inviter = faker.helpers.arrayElement(users);
            const role =
                roles.length > 0
                    ? faker.helpers.arrayElement(roles)
                    : undefined;

            invitations.push({
                workspace: workspace,
                inviter: inviter,
                inviteeEmail: faker.internet.email(),
                role: role,
                status: ENUM_INVITATION_STATUS.PENDING,
                token: faker.string.uuid(),
                expiresAt: faker.date.future(),
                acceptedAt: null,
                acceptedByUser: null,
                revokedAt: null,
            });
        }

        // Create accepted invitations
        for (let i = 0; i < 3; i++) {
            const workspace = faker.helpers.arrayElement(workspaces);
            const inviter = faker.helpers.arrayElement(users);
            const acceptedByUser = faker.helpers.arrayElement(
                users.filter(u => u.id !== inviter.id)
            );
            const role =
                roles.length > 0
                    ? faker.helpers.arrayElement(roles)
                    : undefined;

            invitations.push({
                workspace: workspace,
                inviter: inviter,
                inviteeEmail: acceptedByUser.email,
                role: role,
                status: ENUM_INVITATION_STATUS.ACCEPTED,
                token: faker.string.uuid(),
                expiresAt: faker.date.future(),
                acceptedAt: faker.date.recent(),
                acceptedByUser: acceptedByUser,
                revokedAt: null,
            });
        }

        // Create expired invitations
        for (let i = 0; i < 2; i++) {
            const workspace = faker.helpers.arrayElement(workspaces);
            const inviter = faker.helpers.arrayElement(users);
            const role =
                roles.length > 0
                    ? faker.helpers.arrayElement(roles)
                    : undefined;

            invitations.push({
                workspace: workspace,
                inviter: inviter,
                inviteeEmail: faker.internet.email(),
                role: role,
                status: ENUM_INVITATION_STATUS.EXPIRED,
                token: faker.string.uuid(),
                expiresAt: faker.date.past(),
                acceptedAt: null,
                acceptedByUser: null,
                revokedAt: null,
            });
        }

        // Create revoked invitations
        for (let i = 0; i < 1; i++) {
            const workspace = faker.helpers.arrayElement(workspaces);
            const inviter = faker.helpers.arrayElement(users);
            const role =
                roles.length > 0
                    ? faker.helpers.arrayElement(roles)
                    : undefined;

            invitations.push({
                workspace: workspace,
                inviter: inviter,
                inviteeEmail: faker.internet.email(),
                role: role,
                status: ENUM_INVITATION_STATUS.REVOKED,
                token: faker.string.uuid(),
                expiresAt: faker.date.future(),
                acceptedAt: null,
                acceptedByUser: null,
                revokedAt: faker.date.recent(),
            });
        }

        // Save all invitations
        for (const invitationData of invitations) {
            const invitation = this.em.create(InvitationEntity, invitationData);
            this.em.persist(invitation);
        }

        await this.em.flush();
        console.log(`✅ Seeded ${invitations.length} invitations`);
    }
}
