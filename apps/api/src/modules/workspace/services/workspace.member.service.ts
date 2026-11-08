import {
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseGetTotalOptions,
    IDatabaseOptions,
} from '@app/common/database/interfaces/database.interface';
import { ENUM_INVITATION_STATUS } from '@app/modules/invitation/enums/invitation.enum';
import { InvitationEntity } from '@app/modules/invitation/repository/entities/invitation.entity';
import { InvitationService } from '@app/modules/invitation/services/invitation.service';
import { ENUM_POLICY_ROLE_TYPE } from '@app/modules/policy/enums/policy.enum';
import { RoleEntity } from '@app/modules/role/repository/entities/role.entity';
import { UserEntity } from '@app/modules/user/repository/entities/user.entity';
import { EntityManager } from '@mikro-orm/postgresql';
import {
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { plainToInstance } from 'class-transformer';
import { RoleService } from 'src/modules/role/services/role.service';
import { UserService } from 'src/modules/user/services/user.service';
import {
    WorkspaceMemberGetProfileResponseDto,
    WorkspaceMemberGetResponseDto,
} from '../dtos/response/workspace-member.get.response.dto';
import { WorkspaceMemberListResponseDto } from '../dtos/response/workspace-member.list.response.dto';
import { WORKSPACE_DEFAULT_MEMBER_ROLE_NAME } from '../constants/workspace.constant';
import { ENUM_WORKSPACE_STATUS_CODE_ERROR } from '../enums/workspace.status-code.enum';
import { IWorkspaceMemberWithUserDoc } from '../interfaces/workspace-member.interface';
import {
    DecodedInvitationToken,
    IAcceptedInvitation,
    IWorkspaceMemberService,
    WorkspaceMembershipOrNull,
} from '../interfaces/workspace.member.service.interface';
import { WorkspaceMemberEntity } from '../repository/entities/workspace-member.entity';
import { WorkspaceEntity } from '../repository/entities/workspace.entity';
import { WorkspaceMemberRepository } from '../repository/repositories/workspace-member.repository';
import { WorkSpaceRepository } from '../repository/repositories/workspace.repository';
import { WorkspaceSeatQuotaService } from './workspace-seat-quota.service';

@Injectable()
export class WorkspaceMemberService implements IWorkspaceMemberService {
    private readonly invitationTokenSecret: string;
    private readonly invitationTokenExpired: string;

    constructor(
        private readonly em: EntityManager,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly workSpaceRepository: WorkSpaceRepository,
        private readonly workspaceMemberRepository: WorkspaceMemberRepository,
        private readonly userService: UserService,
        private readonly roleService: RoleService,
        private readonly invitationService: InvitationService,
        private readonly seatQuota: WorkspaceSeatQuotaService
    ) {
        this.invitationTokenSecret = this.configService.get<string>(
            'workspace.invitationKey'
        );
        this.invitationTokenExpired = this.configService.get<string>(
            'workspace.invitationExpired'
        );
    }
    findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<IWorkspaceMemberWithUserDoc[]> {
        return this.workspaceMemberRepository.find(find, {
            ...options,
        });
    }
    getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        return this.workspaceMemberRepository.getTotal(find, options);
    }
    findOneById(_id: string, options?: IDatabaseOptions) {
        return this.workspaceMemberRepository.findOneById(_id, options);
    }
    findOne(find: Record<string, any>, options?: IDatabaseOptions) {
        return this.workspaceMemberRepository.findOne(find, options);
    }

    async verifyInvitationToken(
        token: string
    ): Promise<DecodedInvitationToken> {
        try {
            return await this.jwtService.verify(token, {
                secret: this.invitationTokenSecret,
            });
        } catch {
            throw new UnauthorizedException({
                statusCode:
                    ENUM_WORKSPACE_STATUS_CODE_ERROR.INVITATION_LINK_INVALID,
                message: 'workspace.member.join.invalid',
            });
        }
    }

    async joinWorkspace(
        workspaceId: string,
        _userId: string,
        options?: IDatabaseFindOneOptions
    ): Promise<WorkspaceEntity> {
        // Note: The actual membership will be created when a role is assigned
        // This method now just returns the workspace
        return this.workSpaceRepository.findOneById(workspaceId, {
            ...options,
        });
    }

    async findWorkspaceByInvitationCode(
        invitationCode: string,
        options?: IDatabaseFindOneOptions
    ): Promise<WorkspaceEntity> {
        const workspace = await this.workSpaceRepository.findOne(
            {
                invitationCode: invitationCode,
            },
            options
        );

        if (!workspace) {
            throw new NotFoundException({
                statusCode: ENUM_WORKSPACE_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'workspace.error.notFound',
            });
        }

        return workspace;
    }

    async assignRoleToMember(
        workspaceId: string,
        userId: string,
        roleId: string,
        options?: IDatabaseFindOneOptions
    ): Promise<void> {
        const em = options?.em || this.em;

        // Verify the role belongs to the workspace
        const role = await this.roleService.findOne(
            {
                id: roleId,
                workspace: workspaceId,
                isActive: true,
            },
            options
        );

        if (!role) {
            throw new UnauthorizedException({
                statusCode: ENUM_WORKSPACE_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'role.error.notFound',
            });
        }

        // Find the user
        const user = await this.userService.findOneById(userId, options);

        if (!user) {
            throw new UnauthorizedException({
                statusCode: ENUM_WORKSPACE_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'user.error.notFound',
            });
        }

        // Check if the user already has ANY role in the workspace
        const existingUserMemberships =
            await this.workspaceMemberRepository.find(
                {
                    workspace: workspaceId,
                    user: userId,
                    isActive: true,
                },
                options
            );

        // Check if the user already has this specific role in the workspace
        const alreadyHasRole = existingUserMemberships.some(
            membership => membership.role.id === roleId
        );

        // A new person takes a seat; another role for a member does not.
        if (existingUserMemberships.length === 0) {
            await this.seatQuota.assertCanAddMember(workspaceId);
        }

        // Nothing to do if they already hold it; otherwise create the membership.
        if (!alreadyHasRole) {
            await this.createMembership(
                em,
                workspaceId,
                userId,
                roleId,
                options
            );
        }
    }

    private async createMembership(
        em: EntityManager,
        workspaceId: string,
        userId: string,
        roleId: string,
        options?: IDatabaseFindOneOptions
    ): Promise<void> {
        const membership = new WorkspaceMemberEntity();
        membership.workspace = em.getReference(WorkspaceEntity, workspaceId);
        membership.user = em.getReference(UserEntity, userId);
        membership.role = em.getReference(RoleEntity, roleId);
        membership.joinedAt = new Date();
        membership.isActive = true;

        await this.workspaceMemberRepository.create(membership, options);
    }

    async removeRoleFromMember(
        workspaceId: string,
        userId: string,
        roleId: string
    ): Promise<void> {
        // Check if this is an owner role before removing
        const isOwnerRole = await this.roleService.isWorkspaceOwnerRole(
            roleId,
            workspaceId
        );

        if (isOwnerRole) {
            throw new UnauthorizedException({
                statusCode: ENUM_WORKSPACE_STATUS_CODE_ERROR.DELETE_FORBIDDEN,
                message: 'workspace.error.cannotRemoveOwnerRole',
            });
        }

        // Find the user
        const user = await this.userService.findOneById(userId);

        if (!user) {
            throw new UnauthorizedException({
                statusCode: ENUM_WORKSPACE_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'user.error.notFound',
            });
        }

        // Deactivate this specific workspace/user/role membership
        await this.deactivateMemberships({
            workspace: workspaceId,
            user: userId,
            role: roleId,
            isActive: true,
        });
    }

    // Shared by removeRoleFromMember and removeUserFromWorkspace: both are a
    // soft-delete of one or more memberships matching `find`.
    private deactivateMemberships(find: Record<string, any>) {
        return this.workspaceMemberRepository.updateMany(find, {
            isActive: false,
        });
    }

    async getMemberWorkspaceRoles(
        workspaceId: string,
        userId: string
    ): Promise<RoleEntity[]> {
        const memberships = await this.workspaceMemberRepository.find({
            workspace: workspaceId,
            user: userId,
            isActive: true,
        });

        return memberships.map(({ role }) => role);
    }

    async removeUserFromWorkspace(
        workspaceId: string,
        memberUserId: string
    ): Promise<void> {
        await this.deactivateMemberships({
            workspace: workspaceId,
            user: memberUserId,
            isActive: true,
        });
    }

    async getUserWorkspaces(memberUserId: string): Promise<string[]> {
        const memberships = await this.workspaceMemberRepository.find({
            user: memberUserId,
            isActive: true,
        });

        const workspaceIds = memberships.map(({ workspace }) => workspace.id);

        // De-duplicate: a user can hold more than one active role per workspace.
        return Array.from(new Set(workspaceIds));
    }

    async getMembershipDetails(
        workspaceId: string,
        userId: string
    ): Promise<WorkspaceMembershipOrNull> {
        const criteria = {
            workspace: workspaceId,
            user: userId,
            isActive: true,
        };

        return this.workspaceMemberRepository.findOne(criteria);
    }

    /**
     * The one accept path, shared by the emailed link (token), the in-app
     * Accept button (id) and the join code. Grants the invitation row's role,
     * or the built-in Member role when it has none, and marks it accepted.
     */
    async acceptInvitation(
        invitation: InvitationEntity,
        userId: string,
        options?: IDatabaseFindOneOptions
    ): Promise<IAcceptedInvitation> {
        // Check if invitation is still pending
        if (invitation.status !== ENUM_INVITATION_STATUS.PENDING) {
            throw new UnauthorizedException({
                statusCode:
                    ENUM_WORKSPACE_STATUS_CODE_ERROR.INVITATION_LINK_INVALID,
                message: 'workspace.member.join.alreadyUsed',
            });
        }

        // Check if invitation has expired
        if (invitation.expiresAt < new Date()) {
            throw new UnauthorizedException({
                statusCode:
                    ENUM_WORKSPACE_STATUS_CODE_ERROR.INVITATION_LINK_INVALID,
                message: 'workspace.member.join.expired',
            });
        }

        // The invitation carries an invitedEmail, but the caller must be
        // authenticated as that exact user — never someone who merely knows
        // the token. Compare against the caller's own (JWT-authenticated) id.
        const caller = await this.userService.findOneById(userId);

        if (!caller) {
            // 403, not 401: apps/app retries a 401 as an expired session.
            throw new ForbiddenException({
                statusCode:
                    ENUM_WORKSPACE_STATUS_CODE_ERROR.INVITATION_LINK_INVALID,
                message: 'workspace.member.join.invalid',
            });
        }

        if (
            caller.email.toLowerCase() !== invitation.inviteeEmail.toLowerCase()
        ) {
            // 403, not 401: apps/app retries a 401 as an expired session.
            // The link is fine; it belongs to another account (#184).
            throw new ForbiddenException({
                statusCode:
                    ENUM_WORKSPACE_STATUS_CODE_ERROR.INVITATION_OTHER_ACCOUNT,
                message: 'workspace.member.join.otherAccount',
            });
        }

        // The workspace comes from the invitation row, never from a claim
        // the caller sent.
        const workspaceId = invitation.workspace.id;

        const workspace = await this.joinWorkspace(
            workspaceId,
            userId,
            options
        );

        // The invitation row's role is the one to grant: it is set when the
        // invite is sent and changes when an owner edits it on the
        // Invitations page. The token's roleId is frozen at send time, so it
        // would ignore that edit. No role: the built-in Member role (never
        // Admin, which shares its type).
        const role = await this.roleService.findOne(
            invitation.role?.id
                ? {
                      id: invitation.role.id,
                      workspace: workspaceId,
                      isActive: true,
                  }
                : {
                      workspace: workspaceId,
                      type: ENUM_POLICY_ROLE_TYPE.WORKSPACE_MEMBER,
                      name: WORKSPACE_DEFAULT_MEMBER_ROLE_NAME,
                      isActive: true,
                  },
            options
        );

        if (!role && !invitation.role?.id) {
            // The owner turned the built-in Member role off. Never fall back
            // to Admin, which shares its type.
            throw new ConflictException({
                statusCode:
                    ENUM_WORKSPACE_STATUS_CODE_ERROR.DEFAULT_MEMBER_ROLE_MISSING,
                message: 'workspace.error.defaultMemberRoleMissing',
            });
        }

        if (!role) {
            // The invited role was deleted or turned off since the invite.
            throw new NotFoundException({
                statusCode: ENUM_WORKSPACE_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'role.error.notFound',
            });
        }

        await this.assignRoleToMember(workspaceId, userId, role.id, options);

        // Mark invitation as accepted
        await this.invitationService.accept(invitation.id, userId, options);

        return { workspace, role };
    }

    async getUserIdsFromWorkspaceMembers(
        workspaceMemberIds: string[]
    ): Promise<string[]> {
        const memberships = await this.workspaceMemberRepository.find(
            {
                id: { $in: workspaceMemberIds },
                isActive: true,
            },
            {}
        );

        return memberships.map(membership => membership.user.id);
    }

    // Same lookup as getMembershipDetails under a name the auth/policy guards
    // call it by; kept as a distinct method since it's part of their contract.
    async getWorkspaceMemberByUserId(
        workspaceId: string,
        userId: string
    ): Promise<WorkspaceMembershipOrNull> {
        return this.getMembershipDetails(workspaceId, userId);
    }

    async isUserMemberOfWorkspace(
        workspaceId: string,
        userId: string
    ): Promise<boolean> {
        const membership = await this.getWorkspaceMemberByUserId(
            workspaceId,
            userId
        );

        return !!membership;
    }

    async updateRole(
        repository: WorkspaceMemberEntity,
        role: RoleEntity,
        options?: IDatabaseOptions
    ) {
        const em = options?.em || this.em;
        repository.role = em.getReference(RoleEntity, role.id);

        return this.workspaceMemberRepository.save(repository);
    }

    async delete(repository: WorkspaceMemberEntity) {
        return this.workspaceMemberRepository.delete({
            id: repository.id,
        });
    }

    mapList(
        users: IWorkspaceMemberWithUserDoc[]
    ): WorkspaceMemberListResponseDto[] {
        return plainToInstance(
            WorkspaceMemberListResponseDto,
            users.map(user => user)
        );
    }

    mapDetail(
        user: IWorkspaceMemberWithUserDoc
    ): WorkspaceMemberGetResponseDto {
        return plainToInstance(WorkspaceMemberGetResponseDto, user);
    }

    mapGet(user: IWorkspaceMemberWithUserDoc): WorkspaceMemberGetResponseDto {
        return plainToInstance(WorkspaceMemberGetResponseDto, user);
    }

    mapProfile(
        user: WorkspaceMemberEntity
    ): WorkspaceMemberGetProfileResponseDto {
        return plainToInstance(WorkspaceMemberGetProfileResponseDto, user);
    }

    join(repository: WorkspaceMemberEntity) {
        return repository;
    }
}
