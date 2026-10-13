import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from 'src/common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from 'src/common/doc/enums/doc.enum';
import {
    ChatbotClientDocParamsId,
    ChatbotDocQueryAccount,
    ChatbotDocQueryStatus,
    ChatbotDocQueryType,
} from '../constants/chatbot.doc.constant';
import { ChatbotCreateRequestDto } from '../dtos/request/chatbot.create.request.dto';
import { ChatbotUpdateRequestDto } from '../dtos/request/chatbot.update.request.dto';
import { ChatbotGetDetailResponseDto } from '../dtos/response/chatbot.detail.response.dto';
import { ChatbotListResponseDto } from '../dtos/response/chatbot.list.response.dto';
import { ChatbotModelResponseDto } from '../dtos/response/chatbot.model.response.dto';

export function ChatbotClientListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get all chatbots in the credential workspace',
            description:
                'Retrieve a paginated list of the chatbots in the workspace this client credential belongs to.',
        }),
        DocRequest({
            queries: [
                ...ChatbotDocQueryStatus,
                ...ChatbotDocQueryType,
                ...ChatbotDocQueryAccount,
            ],
        }),
        DocAuth({ xApiKey: true }),
        DocResponsePaging<ChatbotListResponseDto>('chatbot.list', {
            dto: ChatbotListResponseDto,
        })
    );
}

export function ChatbotClientGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get chatbot details',
            description:
                'Retrieve a chatbot in the credential workspace, including its configuration and shop knowledge.',
        }),
        DocRequest({
            params: ChatbotClientDocParamsId,
        }),
        DocAuth({ xApiKey: true }),
        DocResponse<ChatbotGetDetailResponseDto>('chatbot.get', {
            dto: ChatbotGetDetailResponseDto,
        })
    );
}

export function ChatbotClientModelsDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'list the models a chatbot can use' }),
        DocAuth({ xApiKey: true }),
        DocResponse('chatbot.models', { dto: ChatbotModelResponseDto })
    );
}

export function ChatbotClientCreateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'create a chatbot in the credential workspace' }),
        DocRequest({
            dto: ChatbotCreateRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({ xApiKey: true }),
        DocResponse('chatbot.create', { dto: ChatbotListResponseDto })
    );
}

export function ChatbotClientUpdateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'update a chatbot in the credential workspace; only the fields sent change',
        }),
        DocRequest({
            params: ChatbotClientDocParamsId,
            dto: ChatbotUpdateRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({ xApiKey: true }),
        DocResponse('chatbot.update', { dto: ChatbotListResponseDto })
    );
}

export function ChatbotClientActiveDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'activate a chatbot in the credential workspace' }),
        DocRequest({ params: ChatbotClientDocParamsId }),
        DocAuth({ xApiKey: true }),
        DocResponse('chatbot.active', { dto: ChatbotListResponseDto })
    );
}

export function ChatbotClientInactiveDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'deactivate a chatbot in the credential workspace' }),
        DocRequest({ params: ChatbotClientDocParamsId }),
        DocAuth({ xApiKey: true }),
        DocResponse('chatbot.inactive', { dto: ChatbotListResponseDto })
    );
}

export function ChatbotClientDeleteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'delete a chatbot in the credential workspace' }),
        DocRequest({ params: ChatbotClientDocParamsId }),
        DocAuth({ xApiKey: true }),
        DocResponse('chatbot.delete', { dto: ChatbotListResponseDto })
    );
}
