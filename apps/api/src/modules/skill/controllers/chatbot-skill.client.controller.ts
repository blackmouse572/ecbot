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
    ChatbotSkillClientAttachDoc,
    ChatbotSkillClientDetachDoc,
    ChatbotSkillClientListDoc,
} from '../docs/skill.client.doc';
import { AttachSkillRequestDto } from '../dtos/request/attach-skill.request.dto';
import { ChatbotSkillListResponseDto } from '../dtos/response/chatbot-skill.list.response.dto';
import { ChatbotSkillService } from '../services/chatbot-skill.service';

// 3rd-party surface: authenticated by x-api-key (ClientCredential), tenant
// derived from the credential (no :workspace param). See ADR-0012. Writes
// act as the credential's creator, in the records and the activity log.
// The service checks the chatbot and the skill are both in the workspace,
// and attaches only workspace-owned skills (clone a template first).
@ApiTags('modules.client.chatbotSkill')
@Controller('/chatbots/:chatbotId/skills')
export class ChatbotSkillClientController {
    constructor(
        private readonly chatbotSkillService: ChatbotSkillService,
        private readonly activityService: ActivityService
    ) {}

    @ChatbotSkillClientListDoc()
    @Response('skill.chatbot.list.success')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.SKILL,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @Get('/')
    async list(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('chatbotId') chatbotId: string
    ): Promise<IResponse<ChatbotSkillListResponseDto[]>> {
        return {
            data: await this.chatbotSkillService.listByChatbot(
                workspace.id,
                chatbotId
            ),
        };
    }

    @ChatbotSkillClientAttachDoc()
    @Response('skill.attach.success')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.SKILL,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @Post('/:skillId')
    async attach(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @ClientCredentialPayload() credential: ClientCredentialEntity,
        @Param('chatbotId') chatbotId: string,
        @Param('skillId') skillId: string,
        @Body() dto: AttachSkillRequestDto
    ): Promise<IResponse<DatabaseIdResponseDto>> {
        const row = await this.chatbotSkillService.attach(
            workspace.id,
            chatbotId,
            skillId,
            dto
        );
        await this.activityService.createByUserWithWorkspace(
            credential.createdBy,
            workspace,
            {
                action: ENUM_ACTIVITY_ACTION.CHATBOT_SKILL_ENABLE,
                subject: ENUM_POLICY_SUBJECT.SKILL,
                metadata: { chatbotId, skillId },
            }
        );

        return { data: { id: row.id } };
    }

    @ChatbotSkillClientDetachDoc()
    @Response('skill.detach.success')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.SKILL,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @Delete('/:skillId')
    async detach(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @ClientCredentialPayload() credential: ClientCredentialEntity,
        @Param('chatbotId') chatbotId: string,
        @Param('skillId') skillId: string
    ): Promise<IResponse<DatabaseIdResponseDto>> {
        await this.chatbotSkillService.detach(workspace.id, chatbotId, skillId);
        await this.activityService.createByUserWithWorkspace(
            credential.createdBy,
            workspace,
            {
                action: ENUM_ACTIVITY_ACTION.CHATBOT_SKILL_DISABLE,
                subject: ENUM_POLICY_SUBJECT.SKILL,
                metadata: { chatbotId, skillId },
            }
        );

        return { data: { id: skillId } };
    }
}
