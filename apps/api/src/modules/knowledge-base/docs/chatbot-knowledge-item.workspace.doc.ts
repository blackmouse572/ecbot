import { HttpStatus, applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from 'src/common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from 'src/common/doc/enums/doc.enum';
import { DatabaseIdResponseDto } from 'src/common/database/dtos/response/database.id.response.dto';
import { KnowledgeBaseDocParamsKnowledgeBaseId } from '../constants/knowledge-base.doc.constant';
import { ChatbotKnowledgeItemResponseDto } from '../dtos/response/chatbot-knowledge-item.response.dto';
import { WorkspaceDocParamsId } from '../../workspace/constants/workspace.doc.constant';
import { ChatbotDocParamsId } from '../../chatbot/constants/chatbot.doc.constant';

export function ChatbotKnowledgeItemListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'list all knowledge items linked to a chatbot',
        }),
        DocRequest({
            params: [...WorkspaceDocParamsId, ...ChatbotDocParamsId],
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ policy: true }),
        DocResponsePaging<ChatbotKnowledgeItemResponseDto>(
            'chatbotKnowledgeItem.list',
            {
                dto: ChatbotKnowledgeItemResponseDto,
            }
        )
    );
}

export function ChatbotKnowledgeItemLinkDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'link a knowledge item to a chatbot',
        }),
        DocRequest({
            params: [
                ...WorkspaceDocParamsId,
                ...ChatbotDocParamsId,
                {
                    name: 'knowledgeItemId',
                    description: 'Knowledge item ID',
                    required: true,
                    schema: { type: 'string', format: 'uuid' },
                },
            ],
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ policy: true }),
        DocResponse<DatabaseIdResponseDto>('chatbotKnowledgeItem.link', {
            dto: DatabaseIdResponseDto,
            httpStatus: HttpStatus.CREATED,
        })
    );
}

export function ChatbotKnowledgeItemUnlinkDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'unlink a knowledge item from a chatbot',
        }),
        DocRequest({
            params: [
                ...WorkspaceDocParamsId,
                ...ChatbotDocParamsId,
                {
                    name: 'knowledgeItemId',
                    description: 'Knowledge item ID',
                    required: true,
                    schema: { type: 'string', format: 'uuid' },
                },
            ],
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ policy: true }),
        DocResponse<void>('chatbotKnowledgeItem.unlink', {
            httpStatus: HttpStatus.OK,
        })
    );
}
