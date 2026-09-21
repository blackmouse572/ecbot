import {
    IResponse,
    IResponsePaging,
} from '@app/common/response/interfaces/response.interface';
import { ApiKeyProtected } from '@app/modules/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from '@app/modules/auth/decorators/auth.jwt.decorator';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from '@app/modules/policy/enums/policy.enum';
import { UserProtected } from '@app/modules/user/decorators/user.decorator';
import {
    WorkspacePayload,
    WorkspaceScopedProtected,
} from '@app/modules/workspace/decorators/workspace.decorator';
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import {
    Controller,
    Delete,
    Get,
    Param,
    ParseEnumPipe,
    ParseUUIDPipe,
    Query,
} from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { PaginationQuery } from 'src/common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from 'src/common/pagination/dtos/pagination.list.dto';
import { PaginationService } from 'src/common/pagination/services/pagination.service';
import {
    Response,
    ResponsePaging,
} from 'src/common/response/decorators/response.decorator';
import { ENUM_FOLLOWUP_STATUS } from '../constants/followup.constant';
import {
    FollowupWorkspaceCancelDoc,
    FollowupWorkspaceListDoc,
} from '../docs/followup.workspace.doc';
import { FollowupListResponseDto } from '../dtos/response/followup.list.response.dto';
import { FollowupService } from '../services/followup.service';

@ApiTags('modules.workspace.followup')
@Controller({
    version: '1',
    path: '/:workspace/followups',
})
export class FollowupWorkspaceController {
    constructor(
        private readonly followupService: FollowupService,
        private readonly paginationService: PaginationService
    ) {}

    @FollowupWorkspaceListDoc()
    @ResponsePaging('followup.workspace.list')
    @WorkspaceScopedProtected({
        subject: ENUM_POLICY_SUBJECT.CHATBOT,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @ApiQuery({ name: 'chatbot', required: false, type: String })
    @ApiQuery({ name: 'conversationId', required: false, type: String })
    @ApiQuery({ name: 'search', required: false, type: String })
    @ApiQuery({ name: 'status', required: false, enum: ENUM_FOLLOWUP_STATUS })
    @Get('/')
    async list(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @PaginationQuery() { _limit, _offset }: PaginationListDto,
        @Query('chatbot') chatbotId?: string,
        @Query('conversationId') conversationId?: string,
        @Query('search') search?: string,
        // Annotated `string`, not the enum: `design:paramtypes` emits the enum
        // object for an enum-typed param, and the global ValidationPipe
        // (forbidUnknownValues) rejects it as an unknown value — 422 on every
        // request. ParseEnumPipe does the runtime check instead.
        @Query(
            'status',
            new ParseEnumPipe(ENUM_FOLLOWUP_STATUS, { optional: true })
        )
        status?: string
    ): Promise<IResponsePaging<FollowupListResponseDto>> {
        const [followups, total] =
            await this.followupService.findAllByWorkspace(workspace.id, {
                conversationId,
                chatbotId,
                search,
                status: status as ENUM_FOLLOWUP_STATUS,
                limit: _limit,
                offset: _offset,
            });

        return {
            _pagination: {
                total,
                totalPage: this.paginationService.totalPage(total, _limit),
            },
            data: this.followupService.mapList(followups),
        };
    }

    @FollowupWorkspaceCancelDoc()
    @Response('followup.workspace.cancel')
    @WorkspaceScopedProtected({
        subject: ENUM_POLICY_SUBJECT.CHATBOT,
        action: [ENUM_POLICY_ACTION.DELETE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/:id')
    async cancel(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('id', ParseUUIDPipe) id: string
    ): Promise<IResponse<{ cancelled: boolean }>> {
        return {
            data: await this.followupService.cancelForWorkspace(
                workspace.id,
                id
            ),
        };
    }
}
