import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from '@app/common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from '@app/common/doc/enums/doc.enum';
import { WorkspaceDocParamsId } from '@app/modules/workspace/constants/workspace.doc.constant';
import { applyDecorators } from '@nestjs/common';
import { ConversationReactToMessageRequestDto } from '../dtos/request/conversation.react-to-message.request.dto';
import { ConversationSendMessageRequestDto } from '../dtos/request/conversation.send-message.request.dto';
import { ConversationUpdateBotRequestDto } from '../dtos/request/conversation.update-bot.request.dto';
import { ConversationUpdateStatusRequestDto } from '../dtos/request/conversation.update-status.request.dto';
import { ConversationGetResponseDto } from '../dtos/response/conversation.get.response.dto';
import { MessageGetResponseDto } from '../dtos/response/message.get.response.dto';

export function ConversationWorkspaceListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'List conversations in a workspace',
        }),
        DocRequest({
            params: [...WorkspaceDocParamsId],
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponsePaging<ConversationGetResponseDto>(
            'conversation.workspace.list',
            {
                dto: ConversationGetResponseDto,
            }
        )
    );
}

export function ConversationWorkspaceGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Get a single conversation',
        }),
        DocRequest({
            params: [...WorkspaceDocParamsId],
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponse<ConversationGetResponseDto>('conversation.workspace.get', {
            dto: ConversationGetResponseDto,
        })
    );
}

export function ConversationWorkspaceListMessagesDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'List messages in a conversation (operator history view)',
        }),
        DocRequest({
            params: [...WorkspaceDocParamsId],
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponsePaging<MessageGetResponseDto>(
            'conversation.workspace.listMessages',
            {
                dto: MessageGetResponseDto,
            }
        )
    );
}

export function ConversationWorkspaceSendMessageDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Send an operator message to the customer on the platform',
        }),
        DocRequest({
            params: [...WorkspaceDocParamsId],
            dto: ConversationSendMessageRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponse<MessageGetResponseDto>(
            'conversation.workspace.sendMessage',
            {
                dto: MessageGetResponseDto,
            }
        )
    );
}

export function ConversationWorkspaceReactToMessageDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'React (or unreact) to a message as the operator',
        }),
        DocRequest({
            params: [...WorkspaceDocParamsId],
            dto: ConversationReactToMessageRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponse<MessageGetResponseDto>(
            'conversation.workspace.reactToMessage',
            {
                dto: MessageGetResponseDto,
            }
        )
    );
}

export function ConversationWorkspaceUpdateStatusDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Update conversation lifecycle status (resolve / reopen)',
        }),
        DocRequest({
            params: [...WorkspaceDocParamsId],
            dto: ConversationUpdateStatusRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponse<ConversationGetResponseDto>(
            'conversation.workspace.updateStatus',
            {
                dto: ConversationGetResponseDto,
            }
        )
    );
}

export function ConversationWorkspaceUpdateBotDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'Toggle the bot on/off for a conversation (operator takeover)',
        }),
        DocRequest({
            params: [...WorkspaceDocParamsId],
            dto: ConversationUpdateBotRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponse<ConversationGetResponseDto>(
            'conversation.workspace.updateBot',
            {
                dto: ConversationGetResponseDto,
            }
        )
    );
}

export function ConversationWorkspaceMarkReadDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Mark a conversation as read for the current operator',
        }),
        DocRequest({
            params: [...WorkspaceDocParamsId],
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponse('conversation.workspace.markRead')
    );
}
