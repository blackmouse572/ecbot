import { applyDecorators } from '@nestjs/common';
import { DatabaseIdResponseDto } from 'src/common/database/dtos/response/database.id.response.dto';
import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from 'src/common/doc/decorators/doc.decorator';
import { ENUM_DOC_REQUEST_BODY_TYPE } from 'src/common/doc/enums/doc.enum';
import { KnowledgeBaseDocParamsKnowledgeBaseId } from '../constants/knowledge-base.doc.constant';
import { KnowledgeBaseCreateRequestDto } from '../dtos/request/knowledge-base.create.request.dto';
import { KnowledgeBaseUpdateRequestDto } from '../dtos/request/knowledge-base.update.request.dto';
import { KnowledgeBaseResponseDto } from '../dtos/response/knowledge-base.response.dto';

export function KnowledgeBaseClientListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'list the knowledge bases in the credential workspace',
        }),
        DocAuth({ xApiKey: true }),
        DocResponsePaging('knowledgeBase.list', {
            dto: KnowledgeBaseResponseDto,
        })
    );
}

export function KnowledgeBaseClientCreateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'create a knowledge base in the credential workspace',
        }),
        DocRequest({
            dto: KnowledgeBaseCreateRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({ xApiKey: true }),
        DocResponse('knowledgeBase.create', { dto: DatabaseIdResponseDto })
    );
}

export function KnowledgeBaseClientUpdateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'update a knowledge base in the credential workspace',
        }),
        DocRequest({
            params: KnowledgeBaseDocParamsKnowledgeBaseId,
            dto: KnowledgeBaseUpdateRequestDto,
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({ xApiKey: true }),
        DocResponse('knowledgeBase.update', { dto: KnowledgeBaseResponseDto })
    );
}
