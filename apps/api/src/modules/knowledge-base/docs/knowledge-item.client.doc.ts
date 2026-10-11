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
    KnowledgeBaseDocParamsItemId,
    KnowledgeBaseDocParamsKnowledgeBaseId,
    KnowledgeBaseDocQueryItemStatus,
    KnowledgeBaseDocQueryItemTags,
    KnowledgeBaseDocQueryItemType,
} from '../constants/knowledge-base.doc.constant';
import { KnowledgeItemCreateRequestDto } from '../dtos/request/knowledge-item.create.request.dto';
import { KnowledgeItemUpdateRequestDto } from '../dtos/request/knowledge-item.update.request.dto';
import { KnowledgeItemResponseDto } from '../dtos/response/knowledge-item.response.dto';
import { KnowledgeItemShortResponseDto } from '../dtos/response/knowledge-item-short.response.dto';

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

export function KnowledgeItemClientCreateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'create a text or URL knowledge item in a knowledge base of the credential workspace',
        }),
        DocRequest({
            params: KnowledgeBaseDocParamsKnowledgeBaseId,
            dto: KnowledgeItemCreateRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({ xApiKey: true }),
        DocResponse('knowledgeItem.create', {
            dto: KnowledgeItemShortResponseDto,
        })
    );
}

export function KnowledgeItemClientUpdateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'update a knowledge item, or set it READY to process it, in the credential workspace',
        }),
        DocRequest({
            params: [
                ...KnowledgeBaseDocParamsKnowledgeBaseId,
                ...KnowledgeBaseDocParamsItemId,
            ],
            dto: KnowledgeItemUpdateRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({ xApiKey: true }),
        DocResponse('knowledgeItem.update', {
            dto: KnowledgeItemShortResponseDto,
        })
    );
}
