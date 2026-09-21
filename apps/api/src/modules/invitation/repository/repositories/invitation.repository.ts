import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { ENUM_INVITATION_STATUS } from '../../enums/invitation.enum';
import { InvitationEntity } from '../entities/invitation.entity';

@Injectable()
export class InvitationRepository extends DatabaseRepository<InvitationEntity> {
    constructor(em: EntityManager) {
        super(em, InvitationEntity);
    }

    // Method to find invitation by token
    async findByToken(token: string) {
        return this.findOne(
            { token },
            { populate: ['workspace', 'inviter', 'role'] }
        );
    }

    // Method to find pending invitations by email
    async findPendingByEmail(email: string) {
        return this.find(
            { inviteeEmail: email, status: ENUM_INVITATION_STATUS.PENDING },
            { populate: ['workspace', 'inviter', 'role'] }
        );
    }

    // Method to find invitations by workspace
    async findByWorkspace(workspaceId: string) {
        return this.find(
            { workspace: workspaceId },
            { populate: ['inviter', 'role', 'acceptedByUser', 'revokedByUser'] }
        );
    }

    // Method to find expired invitations
    async findExpired() {
        return this.find({ expiresAt: { $lt: new Date() } });
    }
}
