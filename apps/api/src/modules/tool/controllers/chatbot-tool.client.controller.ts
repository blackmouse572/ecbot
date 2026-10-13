import { Response } from '@app/common/response/decorators/response.decorator';
import { IResponse } from '@app/common/response/interfaces/response.interface';
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
import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
    ChatbotToolClientDisableDoc,
    ChatbotToolClientEnableDoc,
    ChatbotToolClientListDoc,
} from '../docs/tool.client.doc';
import { EnableOnChatbotRequestDto } from '../dtos/request/enable-on-chatbot.request.dto';
import { ChatbotToolListResponseDto } from '../dtos/response/chatbot-tool-list.response.dto';
import { ChatbotToolService } from '../services/chatbot-tool.service';

// 3rd-party surface: authenticated by x-api-key (ClientCredential), tenant
// derived from the credential (no :workspace param). See ADR-0012. Writes
// act as the credential's creator, in the records and the activity log.
// The service checks the chatbot and the tool are both in the workspace.
@ApiTags('modules.client.chatbotTool')
@Controller('/chatbots/:chatbotId/tools')
export class ChatbotToolClientController {
    constructor(
        private readonly chatbotToolService: ChatbotToolService,
        private readonly activityService: ActivityService
    ) {}

    @ChatbotToolClientListDoc()
    @Response('tool.chatbot.list.success')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.TOOL,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @Get('/')
    async list(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('chatbotId') chatbotId: string
    ): Promise<IResponse<ChatbotToolListResponseDto[]>> {
        return {
            data: await this.chatbotToolService.listByChatbot(
                workspace.id,
                chatbotId
            ),
        };
    }

    @ChatbotToolClientEnableDoc()
    @Response('tool.enable.success')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.TOOL,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @Post('/:toolId')
    async enable(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @ClientCredentialPayload() credential: ClientCredentialEntity,
        @Param('chatbotId') chatbotId: string,
        @Param('toolId') toolId: string,
        @Body() dto: EnableOnChatbotRequestDto
    ): Promise<IResponse<DatabaseIdResponseDto>> {
        const row = await this.chatbotToolService.enable(
            workspace.id,
            chatbotId,
            toolId,
            dto
        );
        await this.activityService.createByUserWithWorkspace(
            credential.createdBy,
            workspace,
            {
                action: ENUM_ACTIVITY_ACTION.CHATBOT_TOOL_ENABLE,
                subject: ENUM_POLICY_SUBJECT.TOOL,
                metadata: { id: row.id, name: toolId },
            }
        );

        return { data: { id: row.id } };
    }

    @ChatbotToolClientDisableDoc()
    @Response('tool.disable.success')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.TOOL,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @Delete('/:toolId')
    async disable(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @ClientCredentialPayload() credential: ClientCredentialEntity,
        @Param('chatbotId') chatbotId: string,
        @Param('toolId') toolId: string
    ): Promise<IResponse<DatabaseIdResponseDto>> {
        await this.chatbotToolService.disable(workspace.id, chatbotId, toolId);
        await this.activityService.createByUserWithWorkspace(
            credential.createdBy,
            workspace,
            {
                action: ENUM_ACTIVITY_ACTION.CHATBOT_TOOL_DISABLE,
                subject: ENUM_POLICY_SUBJECT.TOOL,
                metadata: { id: toolId, name: toolId },
            }
        );

        return { data: { id: toolId } };
    }
}
