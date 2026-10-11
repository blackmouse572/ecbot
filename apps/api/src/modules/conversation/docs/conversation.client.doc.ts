import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from '@app/common/doc/decorators/doc.decorator';
import { applyDecorators } from '@nestjs/common';
import {
    ConversationDocParamsId,
    ConversationDocQueryAccount,
    ConversationDocQueryAccountType,
    ConversationDocQueryBotEnabled,
    ConversationDocQueryChatbot,
    ConversationDocQueryStatus,
} from '../constants/conversation.doc.constant';
import { ConversationGetResponseDto } from '../dtos/response/conversation.get.response.dto';
import { MessageGetResponseDto } from '../dtos/response/message.get.response.dto';

export function ConversationClientListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'list the conversations in the credential workspace',
        }),
        DocRequest({
            queries: [
                ...ConversationDocQueryStatus,
                ...ConversationDocQueryAccountType,
                ...ConversationDocQueryAccount,
                ...ConversationDocQueryChatbot,
                ...ConversationDocQueryBotEnabled,
            ],
        }),
        DocAuth({ xApiKey: true }),
        DocResponsePaging<ConversationGetResponseDto>(
            'conversation.workspace.list',
            { dto: ConversationGetResponseDto }
        )
    );
}

export function ConversationClientGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get a conversation in the credential workspace',
        }),
        DocRequest({ params: ConversationDocParamsId }),
        DocAuth({ xApiKey: true }),
        DocResponse<ConversationGetResponseDto>('conversation.workspace.get', {
            dto: ConversationGetResponseDto,
        })
    );
}

export function ConversationClientListMessagesDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'list the messages of a conversation in the credential workspace',
        }),
        DocRequest({ params: ConversationDocParamsId }),
        DocAuth({ xApiKey: true }),
        DocResponsePaging<MessageGetResponseDto>(
            'conversation.workspace.listMessages',
            { dto: MessageGetResponseDto }
        )
    );
}
