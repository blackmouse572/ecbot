import { ApiKeyProtected } from '@app/modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@app/modules/auth/decorators/auth.jwt.decorator';
import { ENUM_ACTIVITY_ACTION } from '@app/modules/activity/enums/activity.enum';
import { ActivityService } from '@app/modules/activity/services/activity.service';
import {
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from '@app/modules/policy/enums/policy.enum';
import { UserProtected } from '@app/modules/user/decorators/user.decorator';
import { UserParsePipe } from '@app/modules/user/pipes/user.parse.pipe';
import { UserEntity } from '@app/modules/user/repository/entities/user.entity';
import {
    Body,
    ConflictException,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DatabaseIdResponseDto } from 'src/common/database/dtos/response/database.id.response.dto';
import {
    PaginationQuery,
    PaginationQueryFilterInBoolean,
} from 'src/common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from 'src/common/pagination/dtos/pagination.list.dto';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from 'src/common/pagination/enums/pagination.enum';
import { PaginationService } from 'src/common/pagination/services/pagination.service';
import { RequestRequiredPipe } from 'src/common/request/pipes/request.required.pipe';
import {
    Response,
    ResponsePaging,
} from 'src/common/response/decorators/response.decorator';
import {
    IResponse,
    IResponsePaging,
} from 'src/common/response/interfaces/response.interface';
import {
    ALLOWED_WORKSPACE_POLICY_SUBJECT,
    ROLE_DEFAULT_AVAILABLE_SEARCH,
    ROLE_DEFAULT_IS_ACTIVE,
} from 'src/modules/role/constants/role.list.constant';
import { RoleCreateWorkspaceRequestDto } from 'src/modules/role/dtos/request/role.create.request.dto';
import { RoleUpdateWorkspaceRequestDto } from 'src/modules/role/dtos/request/role.update.request.dto';
import { RoleGetResponseDto } from 'src/modules/role/dtos/response/role.get.response.dto';
import { RoleListResponseDto } from 'src/modules/role/dtos/response/role.list.response.dto';
import { ENUM_ROLE_STATUS_CODE_ERROR } from 'src/modules/role/enums/role.status-code.enum';
import { RoleIsActivePipe } from 'src/modules/role/pipes/role.is-active.pipe';
import { RoleIsUsedPipe } from 'src/modules/role/pipes/role.is-used.pipe';
import { RoleParsePipe } from 'src/modules/role/pipes/role.parse.pipe';
import { RoleEntity } from 'src/modules/role/repository/entities/role.entity';
import { RoleService } from 'src/modules/role/services/role.service';
import {
    WorkspaceOwnerProtected,
    WorkspacePayload,
} from 'src/modules/workspace/decorators/workspace.decorator';
import {
    RoleWorkspaceActiveDoc,
    RoleWorkspaceCreateDoc,
    RoleWorkspaceDeleteDoc,
    RoleWorkspaceGetDoc,
    RoleWorkspaceInactiveDoc,
    RoleWorkspaceListDoc,
    RoleWorkspaceUpdateDoc,
} from '../docs/role.workspace.doc';
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';

@ApiTags('modules.workspace.role')
@Controller({
    version: '1',
    path: '/:workspace/role',
})
export class RoleWorkspaceController {
    constructor(
        private readonly paginationService: PaginationService,
        private readonly roleService: RoleService,
        private readonly activityService: ActivityService
    ) {}

    @RoleWorkspaceListDoc()
    @ResponsePaging('role.list')
    @WorkspaceOwnerProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @PaginationQuery({ availableSearch: ROLE_DEFAULT_AVAILABLE_SEARCH })
        { _search, _limit, _offset, _order }: PaginationListDto,
        @PaginationQueryFilterInBoolean('isActive', ROLE_DEFAULT_IS_ACTIVE)
        isActive: Record<string, any>
    ): Promise<IResponsePaging<RoleListResponseDto>> {
        const find: Record<string, any> = {
            ..._search,
            ...isActive,
            workspace: workspace.id,
        };

        const roles: RoleEntity[] = await this.roleService.findAll(find, {
            paging: {
                limit: _limit,
                offset: _offset,
            },
            order: _order,
        });

        const total: number = await this.roleService.getTotal(find);
        const totalPage: number = this.paginationService.totalPage(
            total,
            _limit
        );
        const mapRoles: RoleListResponseDto[] = this.roleService.mapList(roles);

        return {
            _pagination: { total, totalPage },
            data: mapRoles,
        };
    }

    @Response('role.availableForInvitation')
    @WorkspaceOwnerProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/available-for-invitation')
    async getAvailableRolesForInvitation(
        @WorkspacePayload() workspace: WorkspaceEntity
    ): Promise<IResponse<RoleListResponseDto[]>> {
        const find: Record<string, any> = {
            workspace: workspace.id,
            isActive: true,
        };

        // Get all active roles for this workspace
        const roles: RoleEntity[] = await this.roleService.findAll(find, {
            order: { name: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.ASC }, // Order by name ascending
        });

        // Filter out owner roles to prevent inviting members as owners
        const nonOwnerRoles = [];
        for (const role of roles) {
            const isOwnerRole = await this.roleService.isWorkspaceOwnerRole(
                role.id,
                workspace.id
            );
            if (!isOwnerRole) {
                nonOwnerRoles.push(role);
            }
        }

        const mapRoles: RoleListResponseDto[] =
            this.roleService.mapList(nonOwnerRoles);

        return {
            data: mapRoles,
        };
    }

    @RoleWorkspaceGetDoc()
    @Response('role.get')
    @WorkspaceOwnerProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/get/:role')
    async get(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('role')
        _role: string
    ): Promise<IResponse<RoleGetResponseDto>> {
        const role = await this.roleService.findOneById(_role, {
            populate: ['workspace', 'permissions'],
        });
        console.log('Role service details:', role);
        // Verify role belongs to workspace
        if (role.workspace?.id !== workspace.id) {
            throw new ConflictException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.NOT_ALLOW,
                message: 'role.error.notFound',
            });
        }

        const mapRole: RoleGetResponseDto = this.roleService.mapGet(role);
        console.log('Mapped role:', JSON.stringify(mapRole, null, 2));
        console.log('Mapped role keys:', Object.keys(mapRole));

        return { data: mapRole };
    }

    @RoleWorkspaceCreateDoc()
    @Response('role.create')
    @WorkspaceOwnerProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/create')
    async create(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Body()
        {
            name,
            description,
            permissions,
        }: Omit<RoleCreateWorkspaceRequestDto, 'type'>,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<IResponse<DatabaseIdResponseDto>> {
        this.verifyPolicySubject(permissions);

        const exist: boolean = await this.roleService.existByNameAndWorkspace(
            name,
            workspace.id
        );

        if (exist) {
            throw new ConflictException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.EXIST,
                message: 'role.error.exist',
            });
        }

        const create = await this.roleService.createWithWorkspace(
            {
                name,
                description,
                type: ENUM_POLICY_ROLE_TYPE.USER,
                permissions,
            },
            workspace
        );

        await this.activityService.createByUserWithWorkspace(user, workspace, {
            action: ENUM_ACTIVITY_ACTION.CREATE,
            subject: ENUM_POLICY_SUBJECT.ROLE,
            metadata: {
                id: create.id,
                name: create.name,
            },
        });

        return {
            data: { id: create.id },
        };
    }

    @RoleWorkspaceUpdateDoc()
    @Response('role.update')
    @WorkspaceOwnerProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/update/:role')
    async update(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('role', RequestRequiredPipe, RoleParsePipe) role: RoleEntity,
        @Body()
        { description, permissions }: RoleUpdateWorkspaceRequestDto,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<IResponse<DatabaseIdResponseDto>> {
        this.verifyPolicySubject(permissions);

        // Verify role belongs to workspace
        if (role.workspace?.id !== workspace.id) {
            throw new ConflictException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'role.error.notFound',
            });
        }

        // Prevent updating system roles
        if (role.type === ENUM_POLICY_ROLE_TYPE.SUPER_ADMIN) {
            throw new ConflictException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.INACTIVE_FORBIDDEN,
                message: 'role.error.isSystem',
            });
        }

        await this.roleService.update(role, {
            description,
            permissions,
        });

        await this.activityService.createByUserWithWorkspace(user, workspace, {
            action: ENUM_ACTIVITY_ACTION.UPDATE,
            subject: ENUM_POLICY_SUBJECT.ROLE,
            metadata: {
                id: role.id,
                name: role.name,
            },
        });

        return {
            data: { id: role.id },
        };
    }

    @RoleWorkspaceInactiveDoc()
    @Response('role.inactive')
    @WorkspaceOwnerProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/update/:role/inactive')
    async inactive(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param(
            'role',
            RequestRequiredPipe,
            RoleParsePipe,
            new RoleIsActivePipe([true])
        )
        role: RoleEntity,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<void> {
        // Verify role belongs to workspace
        if (role.workspace?.id !== workspace.id) {
            throw new ConflictException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'role.error.notFound',
            });
        }

        // Prevent deactivating system roles
        if (role.type === ENUM_POLICY_ROLE_TYPE.SUPER_ADMIN) {
            throw new ConflictException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.INACTIVE_FORBIDDEN,
                message: 'role.error.isSystem',
            });
        }

        // Prevent deactivating workspace owner roles
        const isOwnerRole = await this.roleService.isWorkspaceOwnerRole(
            role.id,
            workspace.id
        );

        if (isOwnerRole) {
            throw new ConflictException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.INACTIVE_FORBIDDEN,
                message: 'role.error.cannotDeactivateOwnerRole',
            });
        }

        await this.roleService.inactive(role);

        await this.activityService.createByUserWithWorkspace(user, workspace, {
            action: ENUM_ACTIVITY_ACTION.ROLE_INACTIVE,
            subject: ENUM_POLICY_SUBJECT.ROLE,
            metadata: {
                id: role.id,
                name: role.name,
            },
        });
    }

    @RoleWorkspaceActiveDoc()
    @Response('role.active')
    @WorkspaceOwnerProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/update/:role/active')
    async active(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param(
            'role',
            RequestRequiredPipe,
            RoleParsePipe,
            new RoleIsActivePipe([false])
        )
        role: RoleEntity,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<void> {
        // Verify role belongs to workspace
        if (role.workspace?.id !== workspace.id) {
            throw new ConflictException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'role.error.notFound',
            });
        }

        // Prevent activating system roles
        if (role.type === ENUM_POLICY_ROLE_TYPE.SUPER_ADMIN) {
            throw new ConflictException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.INACTIVE_FORBIDDEN,
                message: 'role.error.isSystem',
            });
        }

        await this.roleService.active(role);

        await this.activityService.createByUserWithWorkspace(user, workspace, {
            action: ENUM_ACTIVITY_ACTION.ROLE_ACTIVE,
            subject: ENUM_POLICY_SUBJECT.ROLE,
            metadata: {
                id: role.id,
                name: role.name,
            },
        });
    }

    @RoleWorkspaceDeleteDoc()
    @Response('role.delete')
    @WorkspaceOwnerProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/delete/:role')
    async delete(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('role', RequestRequiredPipe, RoleParsePipe, RoleIsUsedPipe)
        role: RoleEntity,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<void> {
        // Verify role belongs to workspace
        if (role.workspace?.id !== workspace.id) {
            throw new ConflictException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'role.error.notFound',
            });
        }

        // Prevent deleting system roles
        if (role.type === ENUM_POLICY_ROLE_TYPE.SUPER_ADMIN) {
            throw new ConflictException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.INACTIVE_FORBIDDEN,
                message: 'role.error.isSystem',
            });
        }

        // Prevent deleting workspace owner roles
        const isOwnerRole = await this.roleService.isWorkspaceOwnerRole(
            role.id,
            workspace.id
        );

        if (isOwnerRole) {
            throw new ConflictException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.INACTIVE_FORBIDDEN,
                message: 'role.error.cannotDeleteOwnerRole',
            });
        }

        await this.roleService.delete(role);

        await this.activityService.createByUserWithWorkspace(user, workspace, {
            action: ENUM_ACTIVITY_ACTION.DELETE,
            subject: ENUM_POLICY_SUBJECT.ROLE,
            metadata: {
                id: role.id,
                name: role.name,
            },
        });
    }

    private verifyPolicySubject(
        permissions: RoleCreateWorkspaceRequestDto['permissions']
    ) {
        const permissionSubjects = new Set(permissions.map(p => p.subject));
        const allowedSubjects = new Set(ALLOWED_WORKSPACE_POLICY_SUBJECT);

        for (const subject of permissionSubjects) {
            if (!allowedSubjects.has(subject)) {
                throw new ConflictException({
                    statusCode: ENUM_ROLE_STATUS_CODE_ERROR.FORBIDDEN,
                    message: 'role.error.forbidden',
                });
            }
        }
    }
}
