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
import { DatabaseIdResponseDto } from 'src/common/database/dtos/response/database.id.response.dto';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import { ENUM_ACTIVITY_ACTION } from 'src/modules/activity/enums/activity.enum';
import { ActivityService } from 'src/modules/activity/services/activity.service';
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
    ChatbotSkillWorkspaceAttachDoc,
    ChatbotSkillWorkspaceDetachDoc,
    ChatbotSkillWorkspaceListDoc,
    ChatbotSkillWorkspaceToggleDoc,
} from 'src/modules/skill/docs/chatbot-skill.workspace.doc';
import { AttachSkillRequestDto } from 'src/modules/skill/dtos/request/attach-skill.request.dto';
import { ChatbotSkillListResponseDto } from 'src/modules/skill/dtos/response/chatbot-skill.list.response.dto';
import { ChatbotSkillService } from 'src/modules/skill/services/chatbot-skill.service';
import { UserProtected } from 'src/modules/user/decorators/user.decorator';
import { UserParsePipe } from 'src/modules/user/pipes/user.parse.pipe';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import {
    WorkspacePayload,
    WorkspacePolicyAbilityProtected,
} from 'src/modules/workspace/decorators/workspace.decorator';
import { WorkspaceEntity } from 'src/modules/workspace/repository/entities/workspace.entity';

@ApiTags('modules.workspace.chatbot-skill')
@Controller({
    version: '1',
    path: '/:workspace/chatbot/:chatbotId/skill',
})
export class ChatbotSkillWorkspaceController {
    constructor(
        private readonly svc: ChatbotSkillService,
        private readonly activityService: ActivityService
    ) {}

    @ChatbotSkillWorkspaceListDoc()
    @Response('skill.chatbot.list.success')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.SKILL,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/')
    async list(
        @WorkspacePayload() ws: WorkspaceEntity,
        @Param('chatbotId') chatbotId: string
    ): Promise<IResponse<ChatbotSkillListResponseDto[]>> {
        const result = await this.svc.listByChatbot(ws.id, chatbotId);
        return { data: result };
    }

    @ChatbotSkillWorkspaceAttachDoc()
    @Response('skill.attach.success')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.SKILL,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/:skillId')
    async attach(
        @WorkspacePayload() ws: WorkspaceEntity,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity,
        @Param('chatbotId') chatbotId: string,
        @Param('skillId') skillId: string,
        @Body() dto: AttachSkillRequestDto
    ): Promise<IResponse<DatabaseIdResponseDto>> {
        const row = await this.svc.attach(ws.id, chatbotId, skillId, dto);
        await this.activityService.createByUserWithWorkspace(user, ws, {
            action: ENUM_ACTIVITY_ACTION.CHATBOT_SKILL_ENABLE,
            subject: ENUM_POLICY_SUBJECT.SKILL,
            metadata: { chatbotId, skillId },
        });
        return { data: { id: row.id } };
    }

    @ChatbotSkillWorkspaceToggleDoc()
    @Response('skill.toggle.success')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.SKILL,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/:skillId')
    async toggle(
        @WorkspacePayload() ws: WorkspaceEntity,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity,
        @Param('chatbotId') chatbotId: string,
        @Param('skillId') skillId: string,
        @Body() dto: AttachSkillRequestDto
    ): Promise<IResponse<DatabaseIdResponseDto>> {
        const enabled = dto.enabled ?? true;
        const row = await this.svc.setEnabled(
            ws.id,
            chatbotId,
            skillId,
            enabled
        );
        await this.activityService.createByUserWithWorkspace(user, ws, {
            action: enabled
                ? ENUM_ACTIVITY_ACTION.CHATBOT_SKILL_ENABLE
                : ENUM_ACTIVITY_ACTION.CHATBOT_SKILL_DISABLE,
            subject: ENUM_POLICY_SUBJECT.SKILL,
            metadata: { chatbotId, skillId, enabled },
        });
        return { data: { id: row.id } };
    }

    @ChatbotSkillWorkspaceDetachDoc()
    @Response('skill.detach.success')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.SKILL,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/:skillId')
    async detach(
        @WorkspacePayload() ws: WorkspaceEntity,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity,
        @Param('chatbotId') chatbotId: string,
        @Param('skillId') skillId: string
    ): Promise<IResponse<DatabaseIdResponseDto>> {
        await this.svc.detach(ws.id, chatbotId, skillId);
        await this.activityService.createByUserWithWorkspace(user, ws, {
            action: ENUM_ACTIVITY_ACTION.CHATBOT_SKILL_DISABLE,
            subject: ENUM_POLICY_SUBJECT.SKILL,
            metadata: { chatbotId, skillId },
        });
        return { data: { id: skillId } };
    }
}
