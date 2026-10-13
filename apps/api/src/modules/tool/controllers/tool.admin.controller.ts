import {
    Controller,
    Delete,
    Get,
    Param,
    ParseUUIDPipe,
    Patch,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from '@app/common/pagination/enums/pagination.enum';
import { DatabaseIdResponseDto } from 'src/common/database/dtos/response/database.id.response.dto';
import {
    PaginationQuery,
    PaginationQueryFilterEqual,
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
import {
    PolicyAbilityProtected,
    PolicyRoleProtected,
} from 'src/modules/policy/decorators/policy.decorator';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from 'src/modules/policy/enums/policy.enum';
import {
    TOOL_DEFAULT_AVAILABLE_SEARCH,
    TOOL_DEFAULT_KIND_FILTER,
    TOOL_DEFAULT_STATUS_FILTER,
} from 'src/modules/tool/constants/tool.list.constant';
import {
    ToolAdminActivateDoc,
    ToolAdminDeleteDoc,
    ToolAdminGetDoc,
    ToolAdminInactivateDoc,
    ToolAdminListDoc,
} from 'src/modules/tool/docs/tool.admin.doc';
import {
    ToolAdminListResponseDto,
    ToolAdminResponseDto,
} from 'src/modules/tool/dtos/response/tool.admin.response.dto';
import { ENUM_TOOL_KIND } from 'src/modules/tool/enums/tool-kind.enum';
import { ENUM_TOOL_STATUS } from 'src/modules/tool/enums/tool-status.enum';
import { ToolEntity } from 'src/modules/tool/repository/entities/tool.entity';
import { ToolService } from 'src/modules/tool/services/tool.service';
import { UserProtected } from 'src/modules/user/decorators/user.decorator';
import { UserParsePipe } from 'src/modules/user/pipes/user.parse.pipe';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';

@ApiTags('modules.admin.tool')
@Controller({
    version: '1',
    path: '/tool',
})
export class ToolAdminController {
    constructor(
        private readonly toolService: ToolService,
        private readonly paginationService: PaginationService,
        private readonly activityService: ActivityService
    ) {}

    @ToolAdminListDoc()
    @ResponsePaging('tool.list.success')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.TOOL,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @PaginationQuery({
            availableSearch: TOOL_DEFAULT_AVAILABLE_SEARCH,
            defaultOrderBy: 'createdAt',
            defaultOrderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC,
        })
        { _search, _limit, _offset, _order }: PaginationListDto,
        @PaginationQueryFilterInEnum(
            'kind',
            TOOL_DEFAULT_KIND_FILTER,
            ENUM_TOOL_KIND
        )
        kind: Record<string, any>,
        @PaginationQueryFilterInEnum(
            'status',
            TOOL_DEFAULT_STATUS_FILTER,
            ENUM_TOOL_STATUS
        )
        status: Record<string, any>,
        @PaginationQueryFilterEqual('workspace')
        workspace: Record<string, any>
    ): Promise<IResponsePaging<ToolAdminListResponseDto>> {
        const find: Record<string, any> = {
            ..._search,
            ...kind,
            ...status,
            ...workspace,
        };
        const [tools, total] = await Promise.all([
            this.toolService.findAllSystem(find, {
                limit: _limit,
                offset: _offset,
                order: _order,
            }),
            this.toolService.getTotalSystem(find),
        ]);
        const totalPage = this.paginationService.totalPage(total, _limit);
        return {
            _pagination: { total, totalPage },
            data: this.toolService.mapAdminList(tools),
        };
    }

    @ToolAdminGetDoc()
    @Response('tool.get.success')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.TOOL,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/get/:toolId')
    async get(
        @Param('toolId', ParseUUIDPipe) toolId: string
    ): Promise<IResponse<ToolAdminResponseDto>> {
        const [tool, stats] = await Promise.all([
            this.toolService.getOneAny(toolId),
            this.toolService.getInvocationStats(toolId),
        ]);
        return { data: this.toolService.mapAdminOne(tool, stats) };
    }

    @ToolAdminActivateDoc()
    @Response('tool.activate.success')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.TOOL,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/activate/:toolId')
    async activate(
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity,
        @Param('toolId', ParseUUIDPipe) toolId: string
    ): Promise<IResponse<DatabaseIdResponseDto>> {
        const tool = await this.toolService.activate(toolId);
        await this.log(user, ENUM_ACTIVITY_ACTION.UPDATE, tool);
        return { data: { id: tool.id } };
    }

    @ToolAdminInactivateDoc()
    @Response('tool.inactivate.success')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.TOOL,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/inactivate/:toolId')
    async inactivate(
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity,
        @Param('toolId', ParseUUIDPipe) toolId: string
    ): Promise<IResponse<DatabaseIdResponseDto>> {
        const { tool, changed } = await this.toolService.inactivate(toolId);
        if (changed) await this.log(user, ENUM_ACTIVITY_ACTION.UPDATE, tool);
        return { data: { id: tool.id } };
    }

    @ToolAdminDeleteDoc()
    @Response('tool.delete.success')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.TOOL,
        action: [ENUM_POLICY_ACTION.DELETE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/delete/:toolId')
    async delete(
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity,
        @Param('toolId', ParseUUIDPipe) toolId: string
    ): Promise<IResponse<DatabaseIdResponseDto>> {
        const tool = await this.toolService.softDeleteAny(toolId);
        await this.log(user, ENUM_ACTIVITY_ACTION.DELETE, tool);
        return { data: { id: tool.id } };
    }

    private async log(
        user: UserEntity,
        action: ENUM_ACTIVITY_ACTION,
        tool: ToolEntity
    ): Promise<void> {
        await this.activityService.createByUser(user, {
            action,
            subject: ENUM_POLICY_SUBJECT.TOOL,
            metadata: {
                id: tool.id,
                slug: tool.slug,
                status: tool.status,
                workspaceId: tool.workspace?.id,
            },
        });
    }
}
