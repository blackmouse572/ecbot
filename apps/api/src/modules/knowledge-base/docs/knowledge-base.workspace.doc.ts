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
import { KnowledgeBaseCreateRequestDto } from '../dtos/request/knowledge-base.create.request.dto';
import { KnowledgeBaseUpdateRequestDto } from '../dtos/request/knowledge-base.update.request.dto';
import { KnowledgeBaseResponseDto } from '../dtos/response/knowledge-base.response.dto';
import { WorkspaceDocParamsId } from '../../workspace/constants/workspace.doc.constant';

export function KnowledgeBaseWorkspaceListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'list all knowledge bases in workspace',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ policy: true }),
        DocResponsePaging('knowledgeBase.list', {
            dto: KnowledgeBaseResponseDto,
        })
    );
}

export function KnowledgeBaseWorkspaceGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get detail of a knowledge base',
        }),
        DocRequest({
            params: [
                ...WorkspaceDocParamsId,
                ...KnowledgeBaseDocParamsKnowledgeBaseId,
            ],
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ policy: true }),
        DocResponse('knowledgeBase.get', {
            dto: KnowledgeBaseResponseDto,
        })
    );
}

export function KnowledgeBaseWorkspaceCreateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'create a new knowledge base',
        }),
        DocRequest({
            params: [...WorkspaceDocParamsId],
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: KnowledgeBaseCreateRequestDto,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ policy: true }),
        DocResponse('knowledgeBase.create', {
            httpStatus: HttpStatus.CREATED,
            dto: DatabaseIdResponseDto,
        })
    );
}

export function KnowledgeBaseWorkspaceUpdateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'update a knowledge base',
        }),
        DocRequest({
            params: [
                ...WorkspaceDocParamsId,
                ...KnowledgeBaseDocParamsKnowledgeBaseId,
            ],
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: KnowledgeBaseUpdateRequestDto,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ policy: true }),
        DocResponse('knowledgeBase.update')
    );
}
