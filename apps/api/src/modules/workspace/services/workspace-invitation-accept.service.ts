import { ENUM_ACTIVITY_ACTION } from '@app/modules/activity/enums/activity.enum';
import { ActivityService } from '@app/modules/activity/services/activity.service';
import { ENUM_INVITATION_STATUS_CODE_ERROR } from '@app/modules/invitation/enums/invitation.enum';
import { InvitationEntity } from '@app/modules/invitation/repository/entities/invitation.entity';
import { InvitationService } from '@app/modules/invitation/services/invitation.service';
import { ENUM_POLICY_SUBJECT } from '@app/modules/policy/enums/policy.enum';
import {
    REQUEST_STATUS,
    REQUEST_TYPE,
} from '@app/modules/requests/constant/requests.constant';
import { RequestEntity } from '@app/modules/requests/repository/entities/requests.entity';
import { UserEntity } from '@app/modules/user/repository/entities/user.entity';
import { EntityManager } from '@mikro-orm/postgresql';
import {
    ConflictException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { WORKSPACE_DEFAULT_MEMBER_ROLE_NAME } from '../constants/workspace.constant';
import { WorkspaceJoinResultResponseDto } from '../dtos/response/workspace.join-result.response.dto';
import { WorkspaceMyInvitationResponseDto } from '../dtos/response/workspace.my-invitation.response.dto';
import { ENUM_WORKSPACE_STATUS_CODE_ERROR } from '../enums/workspace.status-code.enum';
import { IAcceptedInvitation } from '../interfaces/workspace.member.service.interface';
import { MemberJoinedEmailService } from './member-joined-email.service';
import { WorkspaceMemberService } from './workspace.member.service';

/**
 * Invitations from the invitee's side: list the ones sent to me, accept or
 * decline one, and accept one when I enter that workspace's join code.
 *
 * "Me" is the account's own email, and only once it is verified
 * (`user.verification.email`, set by the email OTP flow). A client-sent
 * email is never used, and an unverified account sees no invitations.
 */
@Injectable()
export class WorkspaceInvitationAcceptService {
    private readonly logger = new Logger(WorkspaceInvitationAcceptService.name);

    constructor(
        private readonly em: EntityManager,
        private readonly memberService: WorkspaceMemberService,
        private readonly invitationService: InvitationService,
        private readonly activityService: ActivityService,
        private readonly memberJoinedEmail: MemberJoinedEmailService
    ) {}

    async listMine(user: UserEntity): Promise<InvitationEntity[]> {
        if (!this.isVerified(user)) return [];

        const [invitations, memberOf] = await Promise.all([
            this.invitationService.findPendingForEmail(user.email),
            this.memberService.getUserWorkspaces(user.id),
        ]);

        // Already in that workspace (say, a join request was approved):
        // nothing left to accept.
        return invitations.filter(
            invitation => !memberOf.includes(invitation.workspace.id)
        );
    }

    /** One of my pending invitations, or 404 (never says whose it is). */
    async findMine(id: string, user: UserEntity): Promise<InvitationEntity> {
        const [invitation] = this.isVerified(user)
            ? await this.invitationService.findPendingForEmail(user.email, {
                  id,
              })
            : [];

        if (!invitation) {
            throw new NotFoundException({
                statusCode: ENUM_INVITATION_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'invitation.error.notFound',
            });
        }

        return invitation;
    }

    async acceptMine(
        id: string,
        user: UserEntity
    ): Promise<IAcceptedInvitation> {
        return this.accept(await this.findMine(id, user), user);
    }

    async declineMine(id: string, user: UserEntity): Promise<void> {
        const invitation = await this.findMine(id, user);
        // No DECLINED status exists: REVOKED by the invitee themselves takes
        // it off the owner's pending list and frees the seat.
        await this.invitationService.revoke(invitation.id, user.id);
    }

    /**
     * The join-code path: when I already have a pending invitation to this
     * workspace, accept it (its role, never one from the code). Null when
     * there is none, so the caller files a join request as before.
     */
    async acceptMineForWorkspace(
        workspaceId: string,
        user: UserEntity
    ): Promise<IAcceptedInvitation | null> {
        if (!this.isVerified(user)) return null;

        const [invitation] = await this.invitationService.findPendingForEmail(
            user.email,
            { workspace: workspaceId }
        );

        return invitation ? this.accept(invitation, user) : null;
    }

    /** The emailed Accept link. */
    async acceptByToken(
        token: string,
        user: UserEntity
    ): Promise<IAcceptedInvitation> {
        await this.memberService.verifyInvitationToken(token);
        const invitation = await this.invitationService.findOneByToken(token);

        return this.accept(invitation, user);
    }

    /**
     * Every accept goes through here: membership with the invitation role
     * (Member when it has none), the invitation marked accepted, any pending
     * join request of mine to that workspace cancelled, the audit entry, all
     * in one transaction; then the owner's "member joined" email.
     */
    private async accept(
        invitation: InvitationEntity,
        user: UserEntity
    ): Promise<IAcceptedInvitation> {
        const workspaceId = invitation.workspace.id;

        if (
            await this.memberService.isUserMemberOfWorkspace(
                workspaceId,
                user.id
            )
        ) {
            throw new ConflictException({
                statusCode: ENUM_WORKSPACE_STATUS_CODE_ERROR.MEMBER_EXIST,
                message: 'workspace.error.memberExist',
            });
        }

        const em = this.em.fork();
        await em.begin();
        let accepted: IAcceptedInvitation;

        try {
            accepted = await this.memberService.acceptInvitation(
                invitation,
                user.id,
                { em }
            );

            // A join request I filed earlier is moot now: take it off the
            // owner's list.
            await em.nativeUpdate(
                RequestEntity,
                {
                    requestFrom: user.id,
                    workspace: workspaceId,
                    type: REQUEST_TYPE.JOIN_WORKSPACE,
                    status: REQUEST_STATUS.PENDING,
                },
                { status: REQUEST_STATUS.CANCELLED }
            );

            await this.activityService.createByUserWithWorkspace(
                user,
                accepted.workspace,
                {
                    action: ENUM_ACTIVITY_ACTION.JOIN_WORKSPACE,
                    subject: ENUM_POLICY_SUBJECT.WORKSPACE,
                    metadata: {
                        id: accepted.workspace.id,
                        name: accepted.workspace.name,
                        old: { username: user.username },
                        new: {
                            username: user.username,
                            roleId: accepted.role.id,
                        },
                    },
                }
            );
            await em.commit();
        } catch (e) {
            this.logger.error(
                `Failed for user ${user.id} to join workspace ${workspaceId} due to: ${e.message}`
            );
            await em.rollback();

            // Let known errors (invalid/expired/mismatched invitation,
            // role-assignment failures) surface with their real status
            // instead of being flattened into a 500.
            if (e instanceof HttpException) {
                throw e;
            }

            throw new InternalServerErrorException({
                statusCode:
                    ENUM_WORKSPACE_STATUS_CODE_ERROR.INVITATION_LINK_INVALID,
                message: 'workspace.member.join.failed',
            });
        }

        await this.memberJoinedEmail.send(workspaceId, user.id);

        return accepted;
    }

    mapMine(invitation: InvitationEntity): WorkspaceMyInvitationResponseDto {
        const { workspace, inviter } = invitation;

        return {
            id: invitation.id,
            workspace: {
                id: workspace.id,
                name: workspace.name,
                slug: workspace.slug,
                avatar: workspace.avatar,
            },
            inviterName: inviter?.name?.trim() || inviter?.email || '',
            roleName:
                invitation.role?.name ?? WORKSPACE_DEFAULT_MEMBER_ROLE_NAME,
            expiresAt: invitation.expiresAt,
        };
    }

    mapAccepted({
        workspace,
        role,
    }: IAcceptedInvitation): WorkspaceJoinResultResponseDto {
        return {
            joined: true,
            workspace: {
                id: workspace.id,
                name: workspace.name,
                slug: workspace.slug,
                avatar: workspace.avatar,
            },
            roleName: role.name,
        };
    }

    private isVerified(user: UserEntity): boolean {
        return user.verification?.email === true;
    }
}
