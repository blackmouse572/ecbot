import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from 'src/common/doc/decorators/doc.decorator';
import {
    ChatbotClientDocParamsId,
    ChatbotDocQueryAccount,
    ChatbotDocQueryStatus,
    ChatbotDocQueryType,
} from '../constants/chatbot.doc.constant';
import { ChatbotGetDetailResponseDto } from '../dtos/response/chatbot.detail.response.dto';
import { ChatbotListResponseDto } from '../dtos/response/chatbot.list.response.dto';

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
