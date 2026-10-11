import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from '@app/common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from '@app/common/doc/enums/doc.enum';
import { applyDecorators } from '@nestjs/common';
import {
    ConversationDocParamsId,
    ConversationDocQueryAccount,
    ConversationDocQueryAccountType,
    ConversationDocQueryBotEnabled,
    ConversationDocQueryChatbot,
    ConversationDocQueryStatus,
} from '../constants/conversation.doc.constant';
import { ConversationSendMessageRequestDto } from '../dtos/request/conversation.send-message.request.dto';
import { ConversationUpdateBotRequestDto } from '../dtos/request/conversation.update-bot.request.dto';
import { ConversationUpdateStatusRequestDto } from '../dtos/request/conversation.update-status.request.dto';
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

export function ConversationClientSendMessageDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'send a message to the customer as the credential creator, on the conversation platform',
        }),
        DocRequest({
            params: ConversationDocParamsId,
            dto: ConversationSendMessageRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({ xApiKey: true }),
        DocResponse<MessageGetResponseDto>(
            'conversation.workspace.sendMessage',
            { dto: MessageGetResponseDto }
        )
    );
}

export function ConversationClientUpdateStatusDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'resolve or reopen a conversation in the credential workspace',
        }),
        DocRequest({
            params: ConversationDocParamsId,
            dto: ConversationUpdateStatusRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({ xApiKey: true }),
        DocResponse<ConversationGetResponseDto>(
            'conversation.workspace.updateStatus',
            { dto: ConversationGetResponseDto }
        )
    );
}

export function ConversationClientUpdateBotDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'turn the bot on or off for a conversation in the credential workspace',
        }),
        DocRequest({
            params: ConversationDocParamsId,
            dto: ConversationUpdateBotRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({ xApiKey: true }),
        DocResponse<ConversationGetResponseDto>(
            'conversation.workspace.updateBot',
            { dto: ConversationGetResponseDto }
        )
    );
}
