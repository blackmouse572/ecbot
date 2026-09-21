import { ENUM_DOC_REQUEST_BODY_TYPE } from '@app/common/doc/enums/doc.enum';
import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from 'src/common/doc/decorators/doc.decorator';
import { ChatbotAdminDocParamsId } from '../constants/chatbot.admin.doc.constant';
import { ChatbotUpdateRequestDto } from '../dtos/request/chatbot.update.request.dto';
import { ChatbotAdminResponseDto } from '../dtos/response/chatbot.admin.response.dto';

export function ChatbotAdminListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get all chatbots (admin)',
        }),
        DocRequest({
            queries: [],
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponsePaging<ChatbotAdminResponseDto>('chatbot.admin.list', {
            dto: ChatbotAdminResponseDto,
        })
    );
}

export function ChatbotAdminGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get detail of chatbot (admin)',
        }),
        DocRequest({
            params: ChatbotAdminDocParamsId,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponse<ChatbotAdminResponseDto>('chatbot.admin.get', {
            dto: ChatbotAdminResponseDto,
        })
    );
}

export function ChatbotAdminUpdateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'update a chatbot (admin)',
        }),
        DocRequest({
            params: ChatbotAdminDocParamsId,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: ChatbotUpdateRequestDto,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponse('chatbot.admin.update')
    );
}

export function ChatbotAdminDeleteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'delete a chatbot (admin)',
        }),
        DocRequest({
            params: ChatbotAdminDocParamsId,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponse('chatbot.admin.delete')
    );
}
