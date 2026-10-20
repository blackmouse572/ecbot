import { EntityManager } from '@mikro-orm/postgresql';
import {
    Body,
    Controller,
    Get,
    NotFoundException,
    Param,
    ParseUUIDPipe,
    Patch,
    Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from 'src/common/pagination/enums/pagination.enum';
import {
    PaginationQuery,
    PaginationQueryFilterInEnum,
} from 'src/common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from 'src/common/pagination/dtos/pagination.list.dto';
import { PaginationService } from 'src/common/pagination/services/pagination.service';
import {
    Response,
    ResponsePaging,
} from 'src/common/response/decorators/response.decorator';
import {
    IResponse,
    IResponsePaging,
} from 'src/common/response/interfaces/response.interface';
import { ENUM_ACTIVITY_ACTION } from 'src/modules/activity/enums/activity.enum';
import { ActivityService } from 'src/modules/activity/services/activity.service';
import { ApiKeyProtected } from 'src/modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from 'src/modules/auth/decorators/auth.jwt.decorator';
import { IAuthJwtAccessTokenPayload } from 'src/modules/auth/interfaces/auth.interface';
import {
    PolicyAbilityProtected,
    PolicyRoleProtected,
} from 'src/modules/policy/decorators/policy.decorator';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from 'src/modules/policy/enums/policy.enum';
import { UserProtected } from 'src/modules/user/decorators/user.decorator';
import { WORKSPACE_ADMIN_AVAILABLE_SEARCH } from '../constants/workspace.list.constant';
import {
    WorkspaceAdminGetDoc,
    WorkspaceAdminListDoc,
    WorkspaceAdminUpdateStatusDoc,
} from '../docs/workspace.admin.doc';
import { WorkspaceUpdateStatusRequestDto } from '../dtos/request/workspace.update-status.request.dto';
import { WorkspaceAdminResponseDto } from '../dtos/response/workspace.admin.response.dto';
import { ENUM_WORKSPACE_STATUS } from '../enums/workspace.enum';
import { ENUM_WORKSPACE_STATUS_CODE_ERROR } from '../enums/workspace.status-code.enum';
import { WorkspaceOwnerFilterPipe } from '../pipes/workspace.owner-filter.pipe';
import { WorkspaceAdminService } from '../services/workspace.admin.service';

@ApiTags('modules.admin.workspace')
@Controller({
    version: '1',
    path: '/workspace',
})
export class WorkspaceAdminController {
    constructor(
        private readonly workspaceAdminService: WorkspaceAdminService,
        private readonly paginationService: PaginationService,
        private readonly activityService: ActivityService,
        private readonly em: EntityManager
    ) {}

    @WorkspaceAdminListDoc()
    @ResponsePaging('workspace.list')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.WORKSPACE,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @PaginationQuery({
            availableSearch: WORKSPACE_ADMIN_AVAILABLE_SEARCH,
            defaultOrderBy: 'createdAt',
            defaultOrderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC,
        })
        { _search, _limit, _offset, _order }: PaginationListDto,
        @PaginationQueryFilterInEnum('status', null, ENUM_WORKSPACE_STATUS)
        status?: Record<string, any>,
        @Query('owner', WorkspaceOwnerFilterPipe)
        owner?: Record<string, any>
    ): Promise<IResponsePaging<WorkspaceAdminResponseDto>> {
        const find: Record<string, any> = {
            ..._search,
            ...(status ?? {}),
            ...(owner ?? {}),
        };
        const [data, total] = await Promise.all([
            this.workspaceAdminService.findAll(find, {
                limit: _limit,
                offset: _offset,
                order: _order,
            }),
            this.workspaceAdminService.getTotal(find),
        ]);
        const totalPage = this.paginationService.totalPage(total, _limit);
        return { _pagination: { total, totalPage }, data };
    }

    @WorkspaceAdminGetDoc()
    @Response('workspace.details')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.WORKSPACE,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/get/:workspace')
    async get(
        @Param('workspace', ParseUUIDPipe) id: string
    ): Promise<IResponse<WorkspaceAdminResponseDto>> {
        const workspace = await this.workspaceAdminService.findOneById(id);
        if (!workspace) {
            throw new NotFoundException({
                statusCode: ENUM_WORKSPACE_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'workspace.error.notFound',
            });
        }
        return { data: workspace };
    }

    /** Suspend locks the workspace for its members and silences its agents. */
    @WorkspaceAdminUpdateStatusDoc()
    @Response('workspace.updateStatus')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.WORKSPACE,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/update/:workspace/status')
    async updateStatus(
        @Param('workspace', ParseUUIDPipe) id: string,
        @Body() { status }: WorkspaceUpdateStatusRequestDto,
        @AuthJwtPayload<IAuthJwtAccessTokenPayload>()
        { user: adminId }: IAuthJwtAccessTokenPayload
    ): Promise<IResponse<void>> {
        const workspace = await this.workspaceAdminService.findEntityById(id);
        if (!workspace) {
            throw new NotFoundException({
                statusCode: ENUM_WORKSPACE_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'workspace.error.notFound',
            });
        }
        if (workspace.status === status) return {};

        const previous = workspace.status;
        await this.em.transactional(async () => {
            await this.workspaceAdminService.updateStatus(workspace, status);
            await this.activityService.createByAdminWithWorkspace(
                workspace.owner,
                adminId,
                workspace,
                {
                    action: ENUM_ACTIVITY_ACTION.UPDATE,
                    subject: ENUM_POLICY_SUBJECT.WORKSPACE,
                    metadata: { old: { status: previous }, new: { status } },
                }
            );
        });
        return {};
    }
}
