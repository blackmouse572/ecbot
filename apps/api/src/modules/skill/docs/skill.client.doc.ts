import { applyDecorators } from '@nestjs/common';
import { DatabaseIdResponseDto } from 'src/common/database/dtos/response/database.id.response.dto';
import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from 'src/common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from 'src/common/doc/enums/doc.enum';
import {
    ChatbotSkillDocParamsChatbotId,
    SkillDocParamsId,
    SkillDocQuerySource,
} from '../constants/skill.doc.constant';
import { AttachSkillRequestDto } from '../dtos/request/attach-skill.request.dto';
import { CreateSkillRequestDto } from '../dtos/request/create-skill.request.dto';
import { UpdateSkillRequestDto } from '../dtos/request/update-skill.request.dto';
import { ChatbotSkillListResponseDto } from '../dtos/response/chatbot-skill.list.response.dto';
import { SkillGetResponseDto } from '../dtos/response/skill.get.response.dto';
import { SkillListResponseDto } from '../dtos/response/skill.list.response.dto';

export function SkillClientListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'list the skills of the credential workspace, or the builtin templates',
        }),
        DocRequest({
            queries: SkillDocQuerySource,
        }),
        DocAuth({ xApiKey: true }),
        DocResponsePaging('skill.list.success', { dto: SkillListResponseDto })
    );
}

export function SkillClientGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'get a skill with its instructions' }),
        DocRequest({
            params: SkillDocParamsId,
        }),
        DocAuth({ xApiKey: true }),
        DocResponse('skill.get.success', { dto: SkillGetResponseDto })
    );
}

export function SkillClientCreateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'create a skill in the credential workspace' }),
        DocRequest({
            dto: CreateSkillRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({ xApiKey: true }),
        DocResponse('skill.create.success', { dto: DatabaseIdResponseDto })
    );
}

export function SkillClientCloneDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'clone a builtin skill template into the credential workspace',
        }),
        DocRequest({
            params: SkillDocParamsId,
        }),
        DocAuth({ xApiKey: true }),
        DocResponse('skill.clone.success', { dto: DatabaseIdResponseDto })
    );
}

export function SkillClientUpdateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'update a skill of the credential workspace' }),
        DocRequest({
            params: SkillDocParamsId,
            dto: UpdateSkillRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({ xApiKey: true }),
        DocResponse('skill.update.success', { dto: DatabaseIdResponseDto })
    );
}

export function SkillClientDeleteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'delete a skill of the credential workspace' }),
        DocRequest({
            params: SkillDocParamsId,
        }),
        DocAuth({ xApiKey: true }),
        DocResponse('skill.delete.success', { dto: DatabaseIdResponseDto })
    );
}

export function ChatbotSkillClientListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'list the skills a chatbot of the credential workspace loads',
        }),
        DocRequest({
            params: ChatbotSkillDocParamsChatbotId,
        }),
        DocAuth({ xApiKey: true }),
        DocResponse('skill.chatbot.list.success', {
            dto: ChatbotSkillListResponseDto,
        })
    );
}

export function ChatbotSkillClientAttachDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'attach a workspace skill to a chatbot of the credential workspace',
        }),
        DocRequest({
            params: [...ChatbotSkillDocParamsChatbotId, ...SkillDocParamsId],
            dto: AttachSkillRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({ xApiKey: true }),
        DocResponse('skill.attach.success', { dto: DatabaseIdResponseDto })
    );
}

export function ChatbotSkillClientDetachDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'detach a skill from a chatbot of the credential workspace',
        }),
        DocRequest({
            params: [...ChatbotSkillDocParamsChatbotId, ...SkillDocParamsId],
        }),
        DocAuth({ xApiKey: true }),
        DocResponse('skill.detach.success', { dto: DatabaseIdResponseDto })
    );
}
