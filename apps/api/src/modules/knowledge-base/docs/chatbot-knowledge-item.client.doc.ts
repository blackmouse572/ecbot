import { HttpStatus, applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from 'src/common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from 'src/common/doc/enums/doc.enum';
import { DatabaseIdResponseDto } from 'src/common/database/dtos/response/database.id.response.dto';
import { ChatbotKnowledgeItemBatchLinkRequestDto } from '../dtos/request/chatbot-knowledge-item.batch-link.request.dto';
import { ChatbotKnowledgeItemResponseDto } from '../dtos/response/chatbot-knowledge-item.response.dto';
import { KnowledgeItemBatchResultResponseDto } from '../dtos/response/knowledge-item.batch-result.response.dto';

const ChatbotKnowledgeDocParamsChatbotId = [
    {
        name: 'chatbotId',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: '8fca54a4-9e4a-4a31-990d-de34c44b1af3',
    },
];

export function ChatbotKnowledgeItemClientListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'list the knowledge items a chatbot of the credential workspace answers from',
        }),
        DocRequest({ params: ChatbotKnowledgeDocParamsChatbotId }),
        DocAuth({ xApiKey: true }),
        DocResponsePaging<ChatbotKnowledgeItemResponseDto>(
            'knowledgeItem.list',
            { dto: ChatbotKnowledgeItemResponseDto }
        )
    );
}

export function ChatbotKnowledgeItemClientLinkDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'link knowledge items to a chatbot',
            description:
                'Link the items in `ids`, or every item matching `filter` in `knowledgeBaseId` (an empty filter is the whole knowledge base; up to 2000, newest first; `truncated` says when more matched). The response reports which ids succeeded and which failed. An item already linked counts as succeeded.',
        }),
        DocRequest({
            params: ChatbotKnowledgeDocParamsChatbotId,
            dto: ChatbotKnowledgeItemBatchLinkRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({ xApiKey: true }),
        DocResponse<KnowledgeItemBatchResultResponseDto>(
            'knowledgeItem.batchLink',
            {
                dto: KnowledgeItemBatchResultResponseDto,
                httpStatus: HttpStatus.OK,
            }
        )
    );
}

export function ChatbotKnowledgeItemClientUnlinkDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'stop a chatbot answering from a knowledge item' }),
        DocRequest({
            params: [
                ...ChatbotKnowledgeDocParamsChatbotId,
                {
                    name: 'knowledgeItemId',
                    allowEmptyValue: false,
                    required: true,
                    type: 'string',
                    example: 'bab80caa-50d0-496a-9d19-c8a3c3c93520',
                },
            ],
        }),
        DocAuth({ xApiKey: true }),
        DocResponse('knowledgeItem.unlink', { dto: DatabaseIdResponseDto })
    );
}
