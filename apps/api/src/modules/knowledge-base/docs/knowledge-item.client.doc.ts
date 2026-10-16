import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from 'src/common/doc/decorators/doc.decorator';
import { DatabaseIdResponseDto } from 'src/common/database/dtos/response/database.id.response.dto';
import { ENUM_DOC_REQUEST_BODY_TYPE } from 'src/common/doc/enums/doc.enum';
import {
    KnowledgeBaseDocParamsItemId,
    KnowledgeBaseDocParamsKnowledgeBaseId,
    KnowledgeBaseDocQueryItemStatus,
    KnowledgeBaseDocQueryItemTags,
    KnowledgeBaseDocQueryItemType,
} from '../constants/knowledge-base.doc.constant';
import { KnowledgeItemClientCreateRequestDto } from '../dtos/request/knowledge-item.client-create.request.dto';
import { KnowledgeItemUploadUrlRequestDto } from '../dtos/request/knowledge-item.upload-url.request.dto';
import { KnowledgeItemUploadUrlResponseDto } from '../dtos/response/knowledge-item.upload-url.response.dto';
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
                'create a knowledge item in a knowledge base of the credential workspace',
            description:
                'TEXT and URL items take their content. FILE and MEDIA items take their file from exactly one of `fileKey` (a presigned upload, see upload-url) or `fileUrl` (a public link the API downloads).',
        }),
        DocRequest({
            params: KnowledgeBaseDocParamsKnowledgeBaseId,
            dto: KnowledgeItemClientCreateRequestDto,
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

export function KnowledgeItemClientDeleteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'delete a knowledge item of a knowledge base in the credential workspace',
        }),
        DocRequest({
            params: [
                ...KnowledgeBaseDocParamsKnowledgeBaseId,
                ...KnowledgeBaseDocParamsItemId,
            ],
        }),
        DocAuth({ xApiKey: true }),
        DocResponse('knowledgeItem.delete', { dto: DatabaseIdResponseDto })
    );
}

export function KnowledgeItemClientUploadUrlDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: "get a link to upload a FILE or MEDIA item's file",
            description:
                'Checks the type (from the file name), size and storage quota, then returns a presigned PUT link. Upload the file there, then create the item with `fileKey`.',
        }),
        DocRequest({
            params: KnowledgeBaseDocParamsKnowledgeBaseId,
            dto: KnowledgeItemUploadUrlRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({ xApiKey: true }),
        DocResponse('knowledgeItem.uploadUrl', {
            dto: KnowledgeItemUploadUrlResponseDto,
        })
    );
}
