import {
    PaginationQuery,
    PaginationQueryFilterInEnum,
} from '@app/common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from '@app/common/pagination/dtos/pagination.list.dto';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from '@app/common/pagination/enums/pagination.enum';
import { PaginationService } from '@app/common/pagination/services/pagination.service';
import {
    Response,
    ResponsePaging,
} from '@app/common/response/decorators/response.decorator';
import {
    IResponse,
    IResponsePaging,
} from '@app/common/response/interfaces/response.interface';
import { DatabaseIdResponseDto } from 'src/common/database/dtos/response/database.id.response.dto';
import { ENUM_ACTIVITY_ACTION } from '@app/modules/activity/enums/activity.enum';
import { ActivityService } from '@app/modules/activity/services/activity.service';
import {
    ClientCredentialPayload,
    ClientCredentialProtected,
} from '@app/modules/client-credential/decorators/client-credential.decorator';
import { ClientCredentialEntity } from '@app/modules/client-credential/repository/entities/client-credential.entity';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from '@app/modules/policy/enums/policy.enum';
import { WorkspacePayload } from '@app/modules/workspace/decorators/workspace.decorator';
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
    TOOL_DEFAULT_AVAILABLE_SEARCH,
    TOOL_DEFAULT_KIND_FILTER,
    TOOL_DEFAULT_STATUS_FILTER,
} from '../constants/tool.list.constant';
import {
    ToolClientCreateHttpDoc,
    ToolClientCreateMcpDoc,
    ToolClientDeleteDoc,
    ToolClientGetDoc,
    ToolClientListDoc,
    ToolClientUpdateDoc,
} from '../docs/tool.client.doc';
import { CreateHttpToolRequestDto } from '../dtos/request/create-http-tool.request.dto';
import { CreateMcpToolRequestDto } from '../dtos/request/create-mcp-tool.request.dto';
import { UpdateToolRequestDto } from '../dtos/request/update-tool.request.dto';
import { ToolListResponseDto } from '../dtos/response/tool.list.response.dto';
import { ToolResponseDto } from '../dtos/response/tool.response.dto';
import { ENUM_TOOL_KIND } from '../enums/tool-kind.enum';
import { ENUM_TOOL_STATUS } from '../enums/tool-status.enum';
import { ToolService } from '../services/tool.service';

// 3rd-party surface: authenticated by x-api-key (ClientCredential), tenant
// derived from the credential (no :workspace param). See ADR-0012. Writes
// act as the credential's creator, in the records and the activity log.
// The service scopes every lookup to the workspace (404 otherwise).
@ApiTags('modules.client.tool')
@Controller('/tools')
export class ToolClientController {
    constructor(
        private readonly toolService: ToolService,
        private readonly paginationService: PaginationService,
        private readonly activityService: ActivityService
    ) {}

    @ToolClientListDoc()
    @ResponsePaging('tool.list.success')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.TOOL,
        action: [ENUM_POLICY_ACTION.READ],
    })
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
            { queryField: 'kind' }
        )
        kind: Record<string, any>,
        @PaginationQueryFilterInEnum(
            'status',
            TOOL_DEFAULT_STATUS_FILTER,
            ENUM_TOOL_STATUS,
            { queryField: 'status' }
        )
        status: Record<string, any>
    ): Promise<IResponsePaging<ToolListResponseDto>> {
        const find: Record<string, any> = { ..._search, ...kind, ...status };

        const [tools, total] = await Promise.all([
            this.toolService.findAllByWorkspace(workspace.id, find, {
                limit: _limit,
                offset: _offset,
                order: _order,
            }),
            this.toolService.getTotalByWorkspace(workspace.id, find),
        ]);

        return {
            _pagination: {
                total,
                totalPage: this.paginationService.totalPage(total, _limit),
            },
            data: this.toolService.mapList(tools),
        };
    }

    @ToolClientGetDoc()
    @Response('tool.get.success')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.TOOL,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @Get('/:toolId')
    async get(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('toolId') toolId: string
    ): Promise<IResponse<ToolResponseDto>> {
        const tool = await this.toolService.getOne(workspace.id, toolId);
        return { data: this.toolService.mapOne(tool) };
    }

    @ToolClientCreateHttpDoc()
    @Response('tool.create.success')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.TOOL,
        action: [ENUM_POLICY_ACTION.CREATE],
    })
    @Post('/http')
    async createHttp(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @ClientCredentialPayload() credential: ClientCredentialEntity,
        @Body() dto: CreateHttpToolRequestDto
    ): Promise<IResponse<DatabaseIdResponseDto>> {
        const tool = await this.toolService.createHttp(
            workspace.id,
            dto,
            credential.createdBy
        );
        await this.log(ENUM_ACTIVITY_ACTION.CREATE, workspace, credential, {
            id: tool.id,
            name: tool.displayName,
        });

        return { data: { id: tool.id } };
    }

    @ToolClientCreateMcpDoc()
    @Response('tool.create.success')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.TOOL,
        action: [ENUM_POLICY_ACTION.CREATE],
    })
    @Post('/mcp')
    async createMcp(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @ClientCredentialPayload() credential: ClientCredentialEntity,
        @Body() dto: CreateMcpToolRequestDto
    ): Promise<IResponse<DatabaseIdResponseDto>> {
        const tool = await this.toolService.createMcpOperator(
            workspace.id,
            dto,
            credential.createdBy
        );
        await this.log(ENUM_ACTIVITY_ACTION.CREATE, workspace, credential, {
            id: tool.id,
            name: tool.displayName,
        });

        return { data: { id: tool.id } };
    }

    @ToolClientUpdateDoc()
    @Response('tool.update.success')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.TOOL,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @Patch('/:toolId')
    async update(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @ClientCredentialPayload() credential: ClientCredentialEntity,
        @Param('toolId') toolId: string,
        @Body() dto: UpdateToolRequestDto
    ): Promise<IResponse<DatabaseIdResponseDto>> {
        const tool = await this.toolService.update(
            workspace.id,
            toolId,
            dto,
            credential.createdBy
        );
        await this.log(ENUM_ACTIVITY_ACTION.UPDATE, workspace, credential, {
            id: tool.id,
            name: tool.displayName,
        });

        return { data: { id: tool.id } };
    }

    @ToolClientDeleteDoc()
    @Response('tool.delete.success')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.TOOL,
        action: [ENUM_POLICY_ACTION.DELETE],
    })
    @Delete('/:toolId')
    async delete(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @ClientCredentialPayload() credential: ClientCredentialEntity,
        @Param('toolId') toolId: string
    ): Promise<IResponse<DatabaseIdResponseDto>> {
        const tool = await this.toolService.softDelete(workspace.id, toolId);
        await this.log(ENUM_ACTIVITY_ACTION.DELETE, workspace, credential, {
            id: toolId,
            name: tool.displayName,
        });

        return { data: { id: toolId } };
    }

    private async log(
        action: ENUM_ACTIVITY_ACTION,
        workspace: WorkspaceEntity,
        credential: ClientCredentialEntity,
        metadata: { id: string; name: string }
    ): Promise<void> {
        await this.activityService.createByUserWithWorkspace(
            credential.createdBy,
            workspace,
            { action, subject: ENUM_POLICY_SUBJECT.TOOL, metadata }
        );
    }
}
