import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
} from '@app/common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from '@app/common/doc/enums/doc.enum';
import { DatabaseIdResponseDto } from '@app/common/database/dtos/response/database.id.response.dto';
import { WorkspaceDocParamsId } from '@app/modules/workspace/constants/workspace.doc.constant';
import { applyDecorators } from '@nestjs/common';
import {
    ChatbotSkillDocParamsChatbotId,
    SkillDocParamsId,
} from '../constants/skill.doc.constant';
import { AttachSkillRequestDto } from '../dtos/request/attach-skill.request.dto';
import { ChatbotSkillListResponseDto } from '../dtos/response/chatbot-skill.list.response.dto';

export function ChatbotSkillWorkspaceListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'list skills attached to a chatbot' }),
        DocRequest({
            params: [
                ...WorkspaceDocParamsId,
                ...ChatbotSkillDocParamsChatbotId,
            ],
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ policy: true }),
        DocResponse('skill.chatbot.list.success', {
            dto: ChatbotSkillListResponseDto,
        })
    );
}

export function ChatbotSkillWorkspaceAttachDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'attach a skill to a chatbot' }),
        DocRequest({
            params: [
                ...WorkspaceDocParamsId,
                ...ChatbotSkillDocParamsChatbotId,
                ...SkillDocParamsId,
            ],
            dto: AttachSkillRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ policy: true }),
        DocResponse('skill.attach.success', { dto: DatabaseIdResponseDto })
    );
}

export function ChatbotSkillWorkspaceToggleDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'enable/disable a skill on a chatbot' }),
        DocRequest({
            params: [
                ...WorkspaceDocParamsId,
                ...ChatbotSkillDocParamsChatbotId,
                ...SkillDocParamsId,
            ],
            dto: AttachSkillRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ policy: true }),
        DocResponse('skill.toggle.success', { dto: DatabaseIdResponseDto })
    );
}

export function ChatbotSkillWorkspaceDetachDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'detach a skill from a chatbot' }),
        DocRequest({
            params: [
                ...WorkspaceDocParamsId,
                ...ChatbotSkillDocParamsChatbotId,
                ...SkillDocParamsId,
            ],
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ policy: true }),
        DocResponse('skill.detach.success')
    );
}
