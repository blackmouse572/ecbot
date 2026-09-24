import { PaginationQuery } from '@app/common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from '@app/common/pagination/dtos/pagination.list.dto';
import { PaginationService } from '@app/common/pagination/services/pagination.service';
import {
    Response,
    ResponsePaging,
} from '@app/common/response/decorators/response.decorator';
import { ENUM_ACTIVITY_ACTION } from '@app/modules/activity/enums/activity.enum';
import { ActivityService } from '@app/modules/activity/services/activity.service';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@app/modules/auth/decorators/auth.jwt.decorator';
import {
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from '@app/modules/policy/enums/policy.enum';
import { ENUM_ROLE_STATUS_CODE_ERROR } from '@app/modules/role/enums/role.status-code.enum';
import { RoleEntity } from '@app/modules/role/repository/entities/role.entity';
import { RoleService } from '@app/modules/role/services/role.service';
import { USER_DEFAULT_AVAILABLE_SEARCH } from '@app/modules/user/constants/user.list.constant';
import { UserProtected } from '@app/modules/user/decorators/user.decorator';
import { ENUM_USER_STATUS_CODE_ERROR } from '@app/modules/user/enums/user.status-code.enum';
import { UserParsePipe } from '@app/modules/user/pipes/user.parse.pipe';
import { UserEntity } from '@app/modules/user/repository/entities/user.entity';
import { UserService } from '@app/modules/user/services/user.service';
import { EntityManager } from '@mikro-orm/postgresql';
import {
    BadRequestException,
    Body,
    ConflictException,
    Controller,
    Delete,
    Get,
    HttpException,
    InternalServerErrorException,
    Logger,
    NotFoundException,
    Param,
    Post,
    Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { isEmail } from 'class-validator';
import {
    WorkspaceMemberOrOwnerProtected,
    WorkspaceOwnerProtected,
    WorkspacePayload,
} from '../decorators/workspace.decorator';
import {
    WorkspaceCreateJoinRequestDoc,
    WorkspaceFindByInvitationCodeDoc,
} from '../docs/workspace.invitation-code.doc';
import { WorkspaceMemberAcceptInvitationDoc } from '../docs/workspace.member.doc';
import {
    GetInvitableUserListDoc,
    WorkspaceAssignRoleToMemberDoc,
    WorkSpaceOwnerGetMemberDetailsDoc,
    WorkSpaceOwnerMembersListDoc,
    WorkSpaceOwnerMemberRemoveDoc,
} from '../docs/workspace.owner.doc';
import { WorkspaceJoinRequestDto } from '../dtos/request/workspace.join-request.request.dto';
import { WorkspaceMemberGetResponseDto } from '../dtos/response/workspace-member.get.response.dto';
import { ENUM_WORKSPACE_STATUS_CODE_ERROR } from '../enums/workspace.status-code.enum';
import { IWorkspaceMemberWithUserDoc } from '../interfaces/workspace-member.interface';
import { WorkspaceEntity } from '../repository/entities/workspace.entity';
import { WorkspaceMemberService } from '../services/workspace.member.service';
import { WorkspaceOwnerService } from '../services/workspace.owner.service';
import { WorkspaceRequestService } from '../services/workspace.request.service';

@ApiTags('modules.member.workspace')
@Controller({
    version: '1',
    path: 'workspace/member',
})
export class WorkspaceMemberController {
    private readonly logger = new Logger();

    constructor(
        private readonly em: EntityManager,
        private readonly userService: UserService,
        private readonly workSpaceMemberService: WorkspaceMemberService,
        private readonly workSpaceService: WorkspaceOwnerService,
        private readonly roleService: RoleService,
        private readonly paginationService: PaginationService,
        private readonly activityService: ActivityService,
        private readonly workspaceRequestService: WorkspaceRequestService
    ) {}

    @WorkspaceCreateJoinRequestDoc()
    @Response('workspace.member.joinRequest.success')
    @UserProtected()
    @AuthJwtAccessProtected()
    @Post('/join/:invitationcode')
    async createJoinRequestByInvitationCode(
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity,
        @Param('invitationcode') invitationCode: string,
        @Body() body: WorkspaceJoinRequestDto
    ) {
        // Find workspace by invitation code
        const workspace =
            await this.workSpaceMemberService.findWorkspaceByInvitationCode(
                invitationCode
            );

        // Check if user is already a member
        const isUserAlreadyMember =
            await this.workSpaceMemberService.isUserMemberOfWorkspace(
                workspace.id,
                user.id
            );

        if (isUserAlreadyMember) {
            throw new ConflictException({
                statusCode: ENUM_WORKSPACE_STATUS_CODE_ERROR.MEMBER_EXIST,
                message: 'workspace.error.memberExist',
            });
        }

        // Create join workspace request
        const request =
            await this.workspaceRequestService.createJoinWorkspaceRequest(
                user,
                workspace.owner.id,
                invitationCode,
                body.reason
            );

        return { data: { requestId: request.id } };
    }

    @WorkspaceFindByInvitationCodeDoc()
    @Response('workspace.findByInvitationCode.success')
    @Get('/token/:invitationcode')
    async findWorkspaceByInvitationCode(
        @Param('invitationcode') invitationCode: string
    ): Promise<{ data: WorkspaceMemberGetResponseDto }> {
        // Find workspace by invitation code
        const workspace =
            await this.workSpaceMemberService.findWorkspaceByInvitationCode(
                invitationCode
            );

        const data = this.workSpaceMemberService.mapDetail(
            workspace as unknown as IWorkspaceMemberWithUserDoc
        );
        return { data };
    }

    @WorkspaceMemberAcceptInvitationDoc()
    @Response('workspace.member.join.success')
    @UserProtected()
    @AuthJwtAccessProtected()
    @Post('/join')
    async joinWorkspace(
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity,
        @Query('token') token: string
    ) {
        // Resolve the target workspace from the token itself (not from the
        // invitedEmail — the caller's identity comes from the JWT, never
        // from a claim inside the token being redeemed).
        const { workspaceId } =
            await this.workSpaceMemberService.verifyInvitationToken(token);

        const workspace = await this.workSpaceService.findOneById(workspaceId);

        const isUserAlreadyMember =
            await this.workSpaceMemberService.isUserMemberOfWorkspace(
                workspaceId,
                user.id
            );

        if (workspace && isUserAlreadyMember) {
            throw new ConflictException({
                statusCode: ENUM_WORKSPACE_STATUS_CODE_ERROR.MEMBER_EXIST,
                message: 'workspace.error.memberExist',
            });
        }

        const em = this.em.fork();
        await em.begin();
        try {
            // Joins as the caller (from the JWT). The service checks the
            // invitation is PENDING, unexpired, and that the caller's own
            // email matches the invitation's invitedEmail.
            const { workspace: joinedWorkspace, roleId } =
                await this.workSpaceMemberService.joinWorkspaceViaInvitation(
                    token,
                    user.id,
                    { em }
                );

            if (!roleId) {
                await this.assignDefaultRole(workspaceId, joinedWorkspace, user);
            }

            await this.activityService.createByUserWithWorkspace(
                user,
                joinedWorkspace,
                {
                    action: ENUM_ACTIVITY_ACTION.JOIN_WORKSPACE,
                    subject: ENUM_POLICY_SUBJECT.WORKSPACE,
                    metadata: {
                        id: joinedWorkspace.id,
                        name: joinedWorkspace.name,
                        old: {
                            username: user.username,
                        },
                        new: {
                            username: user.username,
                            roleId: roleId || null,
                        },
                    },
                }
            );
            await em.commit();
            return;
        } catch (e) {
            this.logger.error(
                `Failed for user ${user.id}[${user.email}] to join workspace ${workspaceId} due to: ${e.message}`
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
    }

    // No roleId on the invitation: fall back to the workspace's default
    // member role. Silently a no-op if that role doesn't exist.
    private async assignDefaultRole(
        workspaceId: string,
        workspace: WorkspaceEntity,
        user: UserEntity
    ): Promise<void> {
        const memberRole = await this.roleService.findOne({
            workspace: workspaceId,
            type: ENUM_POLICY_ROLE_TYPE.WORKSPACE_MEMBER,
            isActive: true,
        });

        if (!memberRole) {
            return;
        }

        try {
            await this.workSpaceMemberService.assignRoleToMember(
                workspaceId,
                user.id,
                memberRole.id
            );
        } catch (err) {
            this.logger.error(
                `Default role assignment failed for ${user.email} (${user.id}) joining ${workspace.name} (${workspace.id}): ${err.message}`
            );
            const failure = new BadRequestException({
                statusCode:
                    ENUM_WORKSPACE_STATUS_CODE_ERROR.INVITATION_LINK_INVALID,
                message: 'workspace.member.join.failed',
            });
            throw failure;
        }
    }

    @ResponsePaging('workspace.member.list')
    @WorkSpaceOwnerMembersListDoc()
    @WorkspaceMemberOrOwnerProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @Get('/:workspace/members')
    async members(
        @AuthJwtPayload('user') _userId: string,
        @WorkspacePayload() workspace: WorkspaceEntity,
        @PaginationQuery({
            availableSearch: USER_DEFAULT_AVAILABLE_SEARCH,
        })
        { _search, _limit, _offset, _order }: PaginationListDto
    ) {
        const find: Record<string, any> = {
            ..._search,
            workspace: workspace.id,
        };
        const members = await this.workSpaceMemberService.findAll(find, {
            paging: {
                limit: _limit,
                offset: _offset,
            },
            order: _order,
            // Populate user + role: the list DTO maps the member's role (and its
            // permission count) and the user profile; without this the role
            // reference is unloaded and serialization throws.
            populate: ['user', 'role'],
        });
        const total: number = await this.workSpaceMemberService.getTotal(find);
        const totalPage: number = this.paginationService.totalPage(
            total,
            _limit
        );
        const data = this.workSpaceMemberService.mapList(members);
        return { data, _pagination: { total, totalPage } };
    }

    @Response('workspace.member.details')
    @WorkSpaceOwnerGetMemberDetailsDoc()
    @WorkspaceMemberOrOwnerProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @Get('/:workspace/members/:user')
    async memberDetails(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('user') userId: string
    ) {
        const member = await this.workSpaceMemberService.findOne(
            {
                workspace: workspace.id,
                $or: [{ user: userId }, { id: userId }],
            },
            // Populate user + role so the detail DTO (which maps the role and its
            // permission count) does not throw on an unloaded reference.
            { populate: ['user', 'role'] }
        );
        if (!member) {
            throw new NotFoundException({
                statusCode: ENUM_WORKSPACE_STATUS_CODE_ERROR.MEMBER_NOT_FOUND,
                message: 'workspace.error.memberNotFound',
            });
        }

        const data = this.workSpaceMemberService.mapDetail(
            member as unknown as IWorkspaceMemberWithUserDoc
        );
        return { data };
    }

    @ResponsePaging('workspace.member.list')
    @GetInvitableUserListDoc()
    @WorkspaceMemberOrOwnerProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @Get('/:workspace/invitable')
    async getAvailableInviteMembers(
        @AuthJwtPayload('user') callerId: string,
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Query('search') search: string | undefined,
        // Only 'name' is searchable here — unlike USER_DEFAULT_AVAILABLE_SEARCH,
        // this must never fuzzy-match on email (that's what let any member
        // enumerate arbitrary platform users' addresses).
        @PaginationQuery({
            availableSearch: ['name'],
        })
        { _search, _limit, _offset, _order }: PaginationListDto
    ) {
        // Extract user IDs of current members. findAll must be awaited (a
        // Promise cannot be used as a $nin operand) and must populate `user`.
        const currentMembers = await this.workSpaceMemberService.findAll(
            { workspace: workspace.id },
            { populate: ['user'] }
        );
        const memberIds = currentMembers.map(member => (member as any).user.id);
        const trimmedSearch = search?.trim();

        // A full email is looked up exactly (never $ilike — Task 12 makes
        // every email lookup exact) among ALL platform users: the caller
        // typed a specific address, so there's nothing to enumerate.
        if (trimmedSearch && isEmail(trimmedSearch)) {
            return this.findInvitableByExactEmail(trimmedSearch, memberIds, {
                limit: _limit,
                offset: _offset,
            });
        }

        // Otherwise (a partial name, or an empty search): fuzzy-match by name
        // only among users who already share a workspace with the caller —
        // never the whole platform — and never expose their email.
        return this.findInvitableCoMembers(callerId, memberIds, _search, {
            limit: _limit,
            offset: _offset,
            order: _order,
        });
    }

    private async findInvitableByExactEmail(
        email: string,
        excludedMemberIds: string[],
        { limit, offset }: { limit: number; offset: number }
    ) {
        const find: Record<string, any> = {
            email: email.toLowerCase(),
            id: { $nin: excludedMemberIds },
        };
        const invitableUsers =
            await this.userService.findAllWithRoleAndCountry(find, {
                paging: { limit, offset },
            });
        const total = await this.countInvitableUsers(find);
        const totalPage: number = this.paginationService.totalPage(
            total,
            limit
        );

        return {
            data: invitableUsers.map(user => this.userService.mapShort(user)),
            _pagination: { total, totalPage },
        };
    }

    private async findInvitableCoMembers(
        callerId: string,
        excludedMemberIds: string[],
        nameSearch: Record<string, any> | undefined,
        paging: { limit: number; offset: number; order: any }
    ) {
        const coMemberIds = await this.getCoMemberIds(callerId);

        if (coMemberIds.length === 0) {
            return {
                data: [],
                _pagination: {
                    total: 0,
                    totalPage: this.paginationService.totalPage(
                        0,
                        paging.limit
                    ),
                },
            };
        }

        const find: Record<string, any> = {
            ...nameSearch,
            id: { $in: coMemberIds, $nin: excludedMemberIds },
        };
        const invitableUsers =
            await this.userService.findAllWithRoleAndCountry(find, {
                paging: { limit: paging.limit, offset: paging.offset },
                order: paging.order,
            });
        const total = await this.countInvitableUsers(find);
        const totalPage: number = this.paginationService.totalPage(
            total,
            paging.limit
        );

        return {
            data: invitableUsers.map(user => this.userService.mapShort(user)),
            _pagination: { total, totalPage },
        };
    }

    // Users who share at least one workspace with the caller. Ownership
    // always creates an active membership row for the owner at workspace
    // creation (see WorkspaceOwnerService.create), so active memberships
    // alone already cover both plain members and owners — no separate
    // owner-only lookup needed.
    private async getCoMemberIds(callerId: string): Promise<string[]> {
        const sharedWorkspaceIds =
            await this.workSpaceMemberService.getUserWorkspaces(callerId);

        if (sharedWorkspaceIds.length === 0) {
            return [];
        }

        const coMembers = await this.workSpaceMemberService.findAll(
            { workspace: { $in: sharedWorkspaceIds }, isActive: true },
            { populate: ['user'] }
        );

        const coMemberIds = coMembers
            .map(member => (member as any).user.id)
            .filter(id => id !== callerId);

        return Array.from(new Set(coMemberIds));
    }

    private countInvitableUsers(find: Record<string, any>): Promise<number> {
        return this.userService.getTotalWithRoleAndCountry(find);
    }

    @Response('workspace.member.remove.success')
    @WorkSpaceOwnerMemberRemoveDoc()
    @WorkspaceOwnerProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @Delete('/:workspace/members/:user')
    async deleteMember(
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity,
        @WorkspacePayload() _workspace: WorkspaceEntity,
        @Param('user') userIdToDelete: string
    ) {
        const member = (await this.workSpaceMemberService.findOne({
            workspace: _workspace.id,
            id: userIdToDelete,
        })) as unknown as IWorkspaceMemberWithUserDoc;
        if (!member) {
            throw new NotFoundException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'workspace.error.memberNotFound',
            });
        }
        await this.workSpaceMemberService.delete(member as any);
        await this.activityService.createByUserWithWorkspace(user, _workspace, {
            action: ENUM_ACTIVITY_ACTION.REMOVE_MEMBER,
            subject: ENUM_POLICY_SUBJECT.WORKSPACE,
            metadata: {
                _id: member.user.id,
                name: member.user.name || member.user.email,
            },
        });
    }

    @WorkspaceAssignRoleToMemberDoc()
    @Response('workspace.member.role.assign.success')
    @WorkspaceOwnerProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @Post('/:workspace/member/:member/role/:role')
    async assignRoleToMember(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('member') memberId: string,
        @Param('role') roleId: string
    ) {
        // Verify the member is part of the workspace
        const member = await this.workSpaceMemberService.findOne({
            workspace: workspace.id,
            id: memberId,
        });

        const role = await this.roleService.findOne({
            workspace: workspace.id,
            id: roleId,
        });

        if (!member) {
            throw new NotFoundException({
                statusCode: ENUM_WORKSPACE_STATUS_CODE_ERROR.MEMBER_NOT_FOUND,
                message: 'workspace.error.memberNotFound',
            });
        }

        if (!role) {
            throw new NotFoundException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'role.error.notFound',
            });
        }

        const data = await this.workSpaceMemberService.updateRole(member, role);

        return { data };
    }

    @Response('workspace.member.role.remove.success')
    @WorkspaceOwnerProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @Delete('/:workspace/member/:memberId/role/:roleId')
    async removeRoleFromMember(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('memberId') memberId: string,
        @Param('roleId') roleId: string
    ): Promise<void> {
        // Verify the member is part of the workspace
        const isMember =
            await this.workSpaceMemberService.isUserMemberOfWorkspace(
                workspace.id,
                memberId
            );

        if (!isMember) {
            throw new NotFoundException({
                statusCode: ENUM_WORKSPACE_STATUS_CODE_ERROR.MEMBER_NOT_FOUND,
                message: 'workspace.error.memberNotFound',
            });
        }

        await this.workSpaceMemberService.removeRoleFromMember(
            workspace.id,
            memberId,
            roleId
        );
    }

    @Response('workspace.member.roles.get.success')
    @WorkspaceOwnerProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @Get('/:workspace/member/:memberId/roles')
    async getMemberRoles(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('memberId') memberId: string
    ): Promise<{ data: RoleEntity[] }> {
        // Verify the member is part of the workspace
        const isMember =
            await this.workSpaceMemberService.isUserMemberOfWorkspace(
                workspace.id,
                memberId
            );

        if (!isMember) {
            throw new NotFoundException({
                statusCode: ENUM_WORKSPACE_STATUS_CODE_ERROR.MEMBER_NOT_FOUND,
                message: 'workspace.error.memberNotFound',
            });
        }

        const roles = await this.workSpaceMemberService.getMemberWorkspaceRoles(
            workspace.id,
            memberId
        );

        return { data: roles };
    }
}
