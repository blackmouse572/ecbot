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
import { BatchIdsRequestDto } from 'src/common/batch/dtos/batch.request.dto';
import { BatchResultResponseDto } from 'src/common/batch/dtos/batch.response.dto';
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

export function ChatbotKnowledgeItemBatchLinkDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'link several knowledge items to a chatbot',
            description:
                'Link every item in `ids` to the chatbot. Each id is processed independently, so the response reports which ones succeeded and which ones failed. An item already linked counts as succeeded.',
        }),
        DocRequest({
            dto: BatchIdsRequestDto,
            params: [
                ...WorkspaceDocParamsId,
                {
                    name: 'chatbotId',
                    description: 'Chatbot ID',
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
        DocResponse<BatchResultResponseDto>('knowledgeItem.batchLink', {
            dto: BatchResultResponseDto,
            httpStatus: HttpStatus.OK,
        })
    );
}
