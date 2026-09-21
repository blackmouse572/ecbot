import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ENUM_ACTIVITY_ACTION } from '@app/modules/activity/enums/activity.enum';
import { ActivityService } from '@app/modules/activity/services/activity.service';
import { DatabaseIdResponseDto } from 'src/common/database/dtos/response/database.id.response.dto';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import { ApiKeyProtected } from 'src/modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from 'src/modules/auth/decorators/auth.jwt.decorator';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from 'src/modules/policy/enums/policy.enum';
import {
    ChatbotToolWorkspaceDisableDoc,
    ChatbotToolWorkspaceEnableDoc,
    ChatbotToolWorkspaceListDoc,
    ChatbotToolWorkspaceListInvocationsDoc,
    ChatbotToolWorkspaceUpdateActionsDoc,
} from 'src/modules/tool/docs/chatbot-tool.workspace.doc';
import { ChatbotToolListResponseDto } from 'src/modules/tool/dtos/response/chatbot-tool-list.response.dto';
import { EnableOnChatbotRequestDto } from 'src/modules/tool/dtos/request/enable-on-chatbot.request.dto';
import { UpdateEnabledActionsRequestDto } from 'src/modules/tool/dtos/request/update-enabled-actions.request.dto';
import { ToolInvocationEntity } from 'src/modules/tool/repository/entities/tool-invocation.entity';
import { ChatbotToolService } from 'src/modules/tool/services/chatbot-tool.service';
import { ToolService } from 'src/modules/tool/services/tool.service';
import { UserProtected } from 'src/modules/user/decorators/user.decorator';
import { UserParsePipe } from '@app/modules/user/pipes/user.parse.pipe';
import { UserEntity } from '@app/modules/user/repository/entities/user.entity';
import {
    WorkspacePayload,
    WorkspacePolicyAbilityProtected,
} from 'src/modules/workspace/decorators/workspace.decorator';
import { WorkspaceEntity } from 'src/modules/workspace/repository/entities/workspace.entity';

@ApiTags('modules.workspace.chatbot-tool')
@Controller({
    version: '1',
    path: '/:workspace/chatbot/:chatbotId/tool',
})
export class ChatbotToolWorkspaceController {
    constructor(
        private readonly svc: ChatbotToolService,
        private readonly toolService: ToolService,
        private readonly activityService: ActivityService
    ) {}

    @ChatbotToolWorkspaceListDoc()
    @Response('tool.chatbot.list.success')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.TOOL,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/')
    async listForChatbot(
        @WorkspacePayload() ws: WorkspaceEntity,
        @Param('chatbotId') chatbotId: string
    ): Promise<IResponse<ChatbotToolListResponseDto[]>> {
        const result = await this.svc.listByChatbot(ws.id, chatbotId);
        return { data: result };
    }

    @ChatbotToolWorkspaceListInvocationsDoc()
    @Response('tool.invocations.list.success')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.TOOL,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/invocations')
    async listInvocations(
        @WorkspacePayload() ws: WorkspaceEntity,
        @Param('chatbotId') chatbotId: string,
        @Query('limit') limit?: string
    ): Promise<IResponse<ToolInvocationEntity[]>> {
        const lim = limit ? Math.min(parseInt(limit, 10) || 100, 500) : 100;
        const rows = await this.toolService.listInvocations(
            ws.id,
            chatbotId,
            lim
        );
        return { data: rows };
    }

    @ChatbotToolWorkspaceEnableDoc()
    @Response('tool.enable.success')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.TOOL,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/:toolId')
    async enable(
        @WorkspacePayload() ws: WorkspaceEntity,
        @Param('chatbotId') chatbotId: string,
        @Param('toolId') toolId: string,
        @Body() dto: EnableOnChatbotRequestDto,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<IResponse<DatabaseIdResponseDto>> {
        const row = await this.svc.enable(ws.id, chatbotId, toolId, dto);

        await this.activityService.createByUserWithWorkspace(user, ws, {
            action: ENUM_ACTIVITY_ACTION.CHATBOT_TOOL_ENABLE,
            subject: ENUM_POLICY_SUBJECT.TOOL,
            metadata: {
                id: row.id,
                name: toolId,
            },
        });

        return { data: { id: row.id } };
    }

    @ChatbotToolWorkspaceDisableDoc()
    @Response('tool.disable.success')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.TOOL,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/:toolId')
    async disable(
        @WorkspacePayload() ws: WorkspaceEntity,
        @Param('chatbotId') chatbotId: string,
        @Param('toolId') toolId: string,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<IResponse<DatabaseIdResponseDto>> {
        await this.svc.disable(ws.id, chatbotId, toolId);

        await this.activityService.createByUserWithWorkspace(user, ws, {
            action: ENUM_ACTIVITY_ACTION.CHATBOT_TOOL_DISABLE,
            subject: ENUM_POLICY_SUBJECT.TOOL,
            metadata: {
                id: toolId,
                name: toolId,
            },
        });

        return { data: { id: toolId } };
    }

    @ChatbotToolWorkspaceUpdateActionsDoc()
    @Response('tool.updateActions.success')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.TOOL,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/:toolId/actions')
    async updateActions(
        @WorkspacePayload() ws: WorkspaceEntity,
        @Param('chatbotId') chatbotId: string,
        @Param('toolId') toolId: string,
        @Body() dto: UpdateEnabledActionsRequestDto,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<IResponse<DatabaseIdResponseDto>> {
        const row = await this.svc.updateActions(ws.id, chatbotId, toolId, dto);

        await this.activityService.createByUserWithWorkspace(user, ws, {
            action: ENUM_ACTIVITY_ACTION.UPDATE,
            subject: ENUM_POLICY_SUBJECT.TOOL,
            metadata: {
                id: row.id,
                name: toolId,
            },
        });

        return { data: { id: row.id } };
    }
}
