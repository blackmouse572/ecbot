import {
    Inject,
    Injectable,
    Optional,
    UnprocessableEntityException,
} from '@nestjs/common';
import { InvitationService } from 'src/modules/invitation/services/invitation.service';
import { ENUM_WORKSPACE_STATUS_CODE_ERROR } from '../enums/workspace.status-code.enum';
import {
    WORKSPACE_SEAT_LIMIT,
    WorkspaceSeatLimit,
} from '../interfaces/workspace-seat-limit.interface';
import { WorkspaceMemberRepository } from '../repository/repositories/workspace-member.repository';

export interface IWorkspaceSeatUsage {
    /** Members holding a seat, the owner included. */
    members: number;
    /** Invitations not yet accepted; each one reserves a seat. */
    pendingInvitations: number;
    /** null means unlimited. */
    limit: number | null;
}

@Injectable()
export class WorkspaceSeatQuotaService {
    constructor(
        private readonly workspaceMemberRepository: WorkspaceMemberRepository,
        private readonly invitationService: InvitationService,
        @Optional()
        @Inject(WORKSPACE_SEAT_LIMIT)
        private readonly seatLimit?: WorkspaceSeatLimit
    ) {}

    async getUsage(workspaceId: string): Promise<IWorkspaceSeatUsage> {
        const [members, pendingInvitations, limit] = await Promise.all([
            this.workspaceMemberRepository.countSeatsByWorkspace(workspaceId),
            this.invitationService.countPendingByWorkspace(workspaceId),
            this.seatLimit?.getSeatLimit(workspaceId) ?? null,
        ]);
        return { members, pendingInvitations, limit: limit ?? null };
    }

    private async countTakenSeats(workspaceId: string): Promise<number> {
        const [members, pendingInvitations] = await Promise.all([
            this.workspaceMemberRepository.countSeatsByWorkspace(workspaceId),
            this.invitationService.countPendingByWorkspace(workspaceId),
        ]);
        return members + pendingInvitations;
    }

    /** A new invitation reserves a seat, so pending ones count as taken. */
    async assertCanInvite(workspaceId: string): Promise<void> {
        const limit = await this.seatLimit?.getSeatLimit(workspaceId);
        if (limit === undefined || limit === null) return;
        const taken = await this.countTakenSeats(workspaceId);
        if (taken >= limit) this.refuse(taken, limit);
    }

    /**
     * Checked when someone actually joins: an invitation sent before a
     * downgrade must not push the workspace past its new plan.
     */
    async assertCanAddMember(workspaceId: string): Promise<void> {
        const limit = await this.seatLimit?.getSeatLimit(workspaceId);
        if (limit === undefined || limit === null) return;
        const members =
            await this.workspaceMemberRepository.countSeatsByWorkspace(
                workspaceId
            );
        if (members >= limit) this.refuse(members, limit);
    }

    private refuse(usedSeats: number, limit: number): never {
        throw new UnprocessableEntityException({
            statusCode: ENUM_WORKSPACE_STATUS_CODE_ERROR.SEAT_LIMIT_EXCEEDED,
            message: 'workspace.error.seatLimitExceeded',
            errors: { usedSeats, limit },
        });
    }
}
