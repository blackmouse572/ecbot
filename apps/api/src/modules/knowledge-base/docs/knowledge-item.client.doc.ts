import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from 'src/common/doc/decorators/doc.decorator';
import {
    KnowledgeBaseDocParamsItemId,
    KnowledgeBaseDocParamsKnowledgeBaseId,
    KnowledgeBaseDocQueryItemStatus,
    KnowledgeBaseDocQueryItemTags,
    KnowledgeBaseDocQueryItemType,
} from '../constants/knowledge-base.doc.constant';
import { KnowledgeItemResponseDto } from '../dtos/response/knowledge-item.response.dto';

export function KnowledgeItemClientListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'list the knowledge items of a knowledge base in the credential workspace',
        }),
        DocRequest({
            params: KnowledgeBaseDocParamsKnowledgeBaseId,
            queries: [
                ...KnowledgeBaseDocQueryItemType,
                ...KnowledgeBaseDocQueryItemStatus,
                ...KnowledgeBaseDocQueryItemTags,
            ],
        }),
        DocAuth({ xApiKey: true }),
        DocResponsePaging<KnowledgeItemResponseDto>('knowledgeItem.list', {
            dto: KnowledgeItemResponseDto,
        })
    );
}

export function KnowledgeItemClientGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'get a knowledge item of a knowledge base in the credential workspace',
        }),
        DocRequest({
            params: [
                ...KnowledgeBaseDocParamsKnowledgeBaseId,
                ...KnowledgeBaseDocParamsItemId,
            ],
        }),
        DocAuth({ xApiKey: true }),
        DocResponse<KnowledgeItemResponseDto>('knowledgeItem.get', {
            dto: KnowledgeItemResponseDto,
        })
    );
}
