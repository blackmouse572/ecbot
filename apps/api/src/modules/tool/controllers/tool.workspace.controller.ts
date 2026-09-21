import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import {
    PaginationQuery,
    PaginationQueryFilterInEnum,
} from 'src/common/pagination/decorators/pagination.decorator';
import { BatchIdsRequestDto } from 'src/common/batch/dtos/batch.request.dto';
import { BatchResultResponseDto } from 'src/common/batch/dtos/batch.response.dto';
import { runBatch } from 'src/common/batch/utils/run-batch.util';
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
import { ApiKeyProtected } from 'src/modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from 'src/modules/auth/decorators/auth.jwt.decorator';
import { ENUM_ACTIVITY_ACTION } from 'src/modules/activity/enums/activity.enum';
import { ActivityService } from 'src/modules/activity/services/activity.service';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from 'src/modules/policy/enums/policy.enum';
import {
    ToolWorkspaceCreateHttpDoc,
    ToolWorkspaceCreateMcpDoc,
    ToolWorkspaceBatchDeleteDoc,
    ToolWorkspaceDeleteDoc,
    ToolWorkspaceDiscoverDoc,
    ToolWorkspaceGetDoc,
    ToolWorkspaceListDoc,
    ToolWorkspaceTestInlineDoc,
    ToolWorkspaceTestSavedDoc,
    ToolWorkspaceUpdateDoc,
} from 'src/modules/tool/docs/tool.workspace.doc';
import { DatabaseIdResponseDto } from 'src/common/database/dtos/response/database.id.response.dto';
import {
    TOOL_DEFAULT_AVAILABLE_SEARCH,
    TOOL_DEFAULT_KIND_FILTER,
    TOOL_DEFAULT_MCP_PROVIDER_FILTER,
    TOOL_DEFAULT_STATUS_FILTER,
} from 'src/modules/tool/constants/tool.list.constant';
import { CreateHttpToolRequestDto } from 'src/modules/tool/dtos/request/create-http-tool.request.dto';
import { CreateMcpToolRequestDto } from 'src/modules/tool/dtos/request/create-mcp-tool.request.dto';
import { UpdateToolRequestDto } from 'src/modules/tool/dtos/request/update-tool.request.dto';
import {
    TestSavedToolRequestDto,
    TestInlineToolRequestDto,
} from 'src/modules/tool/dtos/request/test-tool.request.dto';
import { ToolTestResponseDto } from 'src/modules/tool/dtos/response/tool-test.response.dto';
import { ToolListResponseDto } from 'src/modules/tool/dtos/response/tool.list.response.dto';
import { ToolResponseDto } from 'src/modules/tool/dtos/response/tool.response.dto';
import { ENUM_MCP_PROVIDER } from 'src/modules/tool/enums/mcp-provider.enum';
import { ENUM_TOOL_KIND } from 'src/modules/tool/enums/tool-kind.enum';
import { ENUM_TOOL_STATUS } from 'src/modules/tool/enums/tool-status.enum';
import { ToolService } from 'src/modules/tool/services/tool.service';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { UserProtected } from 'src/modules/user/decorators/user.decorator';
import { UserParsePipe } from 'src/modules/user/pipes/user.parse.pipe';
import {
    WorkspacePayload,
    WorkspacePolicyAbilityProtected,
} from 'src/modules/workspace/decorators/workspace.decorator';
import { WorkspaceEntity } from 'src/modules/workspace/repository/entities/workspace.entity';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from '@app/common/pagination/enums/pagination.enum';

@ApiTags('modules.workspace.tool')
@Controller({
    version: '1',
    path: '/:workspace/tool',
})
export class ToolWorkspaceController {
    constructor(
        private readonly toolService: ToolService,
        private readonly paginationService: PaginationService,
        private readonly activityService: ActivityService
    ) {}

    @ToolWorkspaceListDoc()
    @ResponsePaging('tool.list.success')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.TOOL,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/')
    async list(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @PaginationQuery({
            availableSearch: TOOL_DEFAULT_AVAILABLE_SEARCH,
            defaultOrderBy: 'createdAt',
            defaultOrderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC,
        })
        { _search, _limit, _offset, _order }: PaginationListDto,
        @PaginationQueryFilterInEnum(
            'kind',
            TOOL_DEFAULT_KIND_FILTER,
            ENUM_TOOL_KIND,
            {
                queryField: 'kind',
            }
        )
        kind: Record<string, any>,
        @PaginationQueryFilterInEnum(
            'status',
            TOOL_DEFAULT_STATUS_FILTER,
            ENUM_TOOL_STATUS,
            {
                queryField: 'status',
            }
        )
        status: Record<string, any>
    ): Promise<IResponsePaging<ToolListResponseDto>> {
        const find: Record<string, any> = {
            ..._search,
            ...kind,
            ...status,
        };
        const [tools, total] = await Promise.all([
            this.toolService.findAllByWorkspace(workspace.id, find, {
                limit: _limit,
                offset: _offset,
                order: _order,
            }),
            this.toolService.getTotalByWorkspace(workspace.id, find),
        ]);

        const totalPage: number = this.paginationService.totalPage(
            total,
            _limit
        );

        return {
            _pagination: { total, totalPage },
            data: this.toolService.mapList(tools),
        };
    }

    @ToolWorkspaceTestInlineDoc()
    @Response('tool.test.success')
    @Throttle({ default: { ttl: 60000, limit: 5 } })
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.TOOL,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/test')
    async testInline(
        @WorkspacePayload() _workspace: WorkspaceEntity,
        @Body() dto: TestInlineToolRequestDto
    ): Promise<IResponse<ToolTestResponseDto>> {
        const result = await this.toolService.testInline(dto);
        return { data: result as ToolTestResponseDto };
    }

    @ToolWorkspaceGetDoc()
    @Response('tool.get.success')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.TOOL,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/:toolId')
    async get(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('toolId') toolId: string
    ): Promise<IResponse<ToolResponseDto>> {
        const tool = await this.toolService.getOne(workspace.id, toolId);
        return { data: this.toolService.mapOne(tool) };
    }

    @ToolWorkspaceCreateHttpDoc()
    @Response('tool.create.success')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.TOOL,
        action: [ENUM_POLICY_ACTION.CREATE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/http')
    async createHttp(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity,
        @Body() dto: CreateHttpToolRequestDto
    ): Promise<IResponse<DatabaseIdResponseDto>> {
        const tool = await this.toolService.createHttp(workspace.id, dto, user);
        await this.activityService.createByUserWithWorkspace(user, workspace, {
            action: ENUM_ACTIVITY_ACTION.CREATE,
            subject: ENUM_POLICY_SUBJECT.TOOL,
            metadata: { id: tool.id, name: tool.displayName },
        });
        return { data: { id: tool.id } };
    }

    @ToolWorkspaceCreateMcpDoc()
    @Response('tool.create.success')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.TOOL,
        action: [ENUM_POLICY_ACTION.CREATE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/mcp')
    async createMcp(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity,
        @Body() dto: CreateMcpToolRequestDto
    ): Promise<IResponse<DatabaseIdResponseDto>> {
        const tool = await this.toolService.createMcpOperator(
            workspace.id,
            dto,
            user
        );
        await this.activityService.createByUserWithWorkspace(user, workspace, {
            action: ENUM_ACTIVITY_ACTION.CREATE,
            subject: ENUM_POLICY_SUBJECT.TOOL,
            metadata: { id: tool.id, name: tool.displayName },
        });
        return { data: { id: tool.id } };
    }

    @ToolWorkspaceUpdateDoc()
    @Response('tool.update.success')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.TOOL,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/:toolId')
    async update(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity,
        @Param('toolId') toolId: string,
        @Body() dto: UpdateToolRequestDto
    ): Promise<IResponse<DatabaseIdResponseDto>> {
        const tool = await this.toolService.update(
            workspace.id,
            toolId,
            dto,
            user
        );
        await this.activityService.createByUserWithWorkspace(user, workspace, {
            action: ENUM_ACTIVITY_ACTION.UPDATE,
            subject: ENUM_POLICY_SUBJECT.TOOL,
            metadata: { id: tool.id, name: tool.displayName },
        });
        return { data: { id: tool.id } };
    }

    @ToolWorkspaceTestSavedDoc()
    @Response('tool.test.success')
    @Throttle({ default: { ttl: 60000, limit: 5 } })
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.TOOL,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/:toolId/test')
    async testSaved(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('toolId') toolId: string,
        @Body() dto: TestSavedToolRequestDto
    ): Promise<IResponse<ToolTestResponseDto>> {
        const result = await this.toolService.testSaved(
            workspace.id,
            toolId,
            dto.args
        );
        return { data: result as ToolTestResponseDto };
    }

    @ToolWorkspaceDiscoverDoc()
    @Response('tool.discover.success')
    @Throttle({ default: { ttl: 60000, limit: 5 } })
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.TOOL,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/:toolId/discover')
    async discover(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('toolId') toolId: string
    ): Promise<IResponse<ToolResponseDto>> {
        const tool = await this.toolService.rediscover(workspace.id, toolId);
        return { data: this.toolService.mapOne(tool) };
    }

    @ToolWorkspaceBatchDeleteDoc()
    @Response('tool.batchDelete.success')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.TOOL,
        action: [ENUM_POLICY_ACTION.DELETE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/batch/delete')
    async batchDelete(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity,
        @Body() { ids }: BatchIdsRequestDto
    ): Promise<IResponse<BatchResultResponseDto>> {
        const data = await runBatch(ids, async toolId => {
            await this.toolService.softDelete(workspace.id, toolId);
            await this.activityService.createByUserWithWorkspace(
                user,
                workspace,
                {
                    action: ENUM_ACTIVITY_ACTION.DELETE,
                    subject: ENUM_POLICY_SUBJECT.TOOL,
                    metadata: { id: toolId },
                }
            );
        });

        return { data };
    }

    @ToolWorkspaceDeleteDoc()
    @Response('tool.delete.success')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.TOOL,
        action: [ENUM_POLICY_ACTION.DELETE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/:toolId')
    async delete(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity,
        @Param('toolId') toolId: string
    ): Promise<IResponse<DatabaseIdResponseDto>> {
        const tool = await this.toolService.softDelete(workspace.id, toolId);
        await this.activityService.createByUserWithWorkspace(user, workspace, {
            action: ENUM_ACTIVITY_ACTION.DELETE,
            subject: ENUM_POLICY_SUBJECT.TOOL,
            metadata: { id: toolId, name: tool.displayName },
        });
        return { data: { id: toolId } };
    }
}
