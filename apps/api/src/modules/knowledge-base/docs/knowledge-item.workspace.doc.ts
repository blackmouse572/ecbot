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
import { WorkspaceDocParamsId } from '../../workspace/constants/workspace.doc.constant';

export function KnowledgeItemWorkspaceListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'list all knowledge items in a knowledge base',
        }),
        DocRequest({
            params: [
                ...WorkspaceDocParamsId,
                ...KnowledgeBaseDocParamsKnowledgeBaseId,
            ],
            queries: [
                ...KnowledgeBaseDocQueryItemType,
                ...KnowledgeBaseDocQueryItemStatus,
                ...KnowledgeBaseDocQueryItemTags,
            ],
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ policy: true }),
        DocResponsePaging<KnowledgeItemResponseDto>('knowledgeItem.list', {
            dto: KnowledgeItemResponseDto,
        })
    );
}

export function KnowledgeItemWorkspaceGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get detail of a knowledge item',
        }),
        DocRequest({
            params: [
                ...WorkspaceDocParamsId,
                ...KnowledgeBaseDocParamsKnowledgeBaseId,
                ...KnowledgeBaseDocParamsItemId,
            ],
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ policy: true }),
        DocResponse<KnowledgeItemResponseDto>('knowledgeItem.get', {
            dto: KnowledgeItemResponseDto,
        })
    );
}

export function KnowledgeItemWorkspaceCreateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'create a new knowledge item',
        }),
        DocRequest({
            params: [
                ...WorkspaceDocParamsId,
                ...KnowledgeBaseDocParamsKnowledgeBaseId,
            ],
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: KnowledgeItemCreateRequestDto,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ policy: true }),
        DocResponse<DatabaseIdResponseDto>('knowledgeItem.create', {
            httpStatus: HttpStatus.CREATED,
            dto: DatabaseIdResponseDto,
        })
    );
}

export function KnowledgeItemWorkspaceUpdateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'update a knowledge item',
        }),
        DocRequest({
            params: [
                ...WorkspaceDocParamsId,
                ...KnowledgeBaseDocParamsKnowledgeBaseId,
                ...KnowledgeBaseDocParamsItemId,
            ],
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
            dto: KnowledgeItemUpdateRequestDto,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ policy: true }),
        DocResponse<KnowledgeItemUpdateRequestDto>('knowledgeItem.update', {
            dto: KnowledgeItemUpdateRequestDto,
        })
    );
}

export function KnowledgeItemWorkspaceDeleteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'delete a knowledge item',
        }),
        DocRequest({
            params: [
                ...WorkspaceDocParamsId,
                ...KnowledgeBaseDocParamsKnowledgeBaseId,
                ...KnowledgeBaseDocParamsItemId,
            ],
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ policy: true }),
        DocResponse<void>('knowledgeItem.delete')
    );
}

export function KnowledgeItemWorkspaceBatchDeleteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'delete several knowledge items',
            description:
                'Soft delete every item in `ids`. Each id is processed independently, so the response reports which ones succeeded and which ones failed.',
        }),
        DocRequest({
            dto: BatchIdsRequestDto,
            params: [
                ...WorkspaceDocParamsId,
                ...KnowledgeBaseDocParamsKnowledgeBaseId,
            ],
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponse<BatchResultResponseDto>('knowledgeItem.batchDelete', {
            dto: BatchResultResponseDto,
            httpStatus: HttpStatus.OK,
        })
    );
}

export function KnowledgeItemWorkspaceBatchProcessDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'process or retry several knowledge items',
            description:
                'Queue every item in `ids` for ingestion. Items already PROCESSING are reported in `failed`; the rest are set to READY and queued.',
        }),
        DocRequest({
            dto: BatchIdsRequestDto,
            params: [
                ...WorkspaceDocParamsId,
                ...KnowledgeBaseDocParamsKnowledgeBaseId,
            ],
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ policy: true }),
        DocResponse<BatchResultResponseDto>('knowledgeItem.batchProcess', {
            dto: BatchResultResponseDto,
            httpStatus: HttpStatus.OK,
        })
    );
}
