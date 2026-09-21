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
import { KnowledgeItemFolderResponseDto } from 'src/modules/knowledge-base/dtos/response/knowledge-item-folder.response.dto';
import { DatabaseIdResponseDto } from 'src/common/database/dtos/response/database.id.response.dto';
import { WorkspaceDocParamsId } from 'src/modules/workspace/constants/workspace.doc.constant';
import {
    KnowledgeBaseDocParamsFolderId,
    KnowledgeBaseDocParamsKnowledgeBaseId,
} from '../constants/knowledge-base.doc.constant';

export function KnowledgeItemFolderWorkspaceListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'list all folders in a knowledge base',
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
        DocResponsePaging<KnowledgeItemFolderResponseDto>(
            'knowledge-base.folder.list',
            { dto: KnowledgeItemFolderResponseDto }
        )
    );
}

export function KnowledgeItemFolderWorkspaceGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get detail of a folder',
        }),
        DocRequest({
            params: [
                ...WorkspaceDocParamsId,
                ...KnowledgeBaseDocParamsKnowledgeBaseId,
                ...KnowledgeBaseDocParamsFolderId,
            ],
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ policy: true }),
        DocResponse('knowledge-base.folder.get')
    );
}

export function KnowledgeItemFolderWorkspaceCreateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'create a new folder in a knowledge base',
        }),
        DocRequest({
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
        DocResponse('knowledge-base.folder.create', {
            httpStatus: HttpStatus.CREATED,
            dto: DatabaseIdResponseDto,
        })
    );
}

export function KnowledgeItemFolderWorkspaceUpdateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'update a folder',
        }),
        DocRequest({
            params: [
                ...WorkspaceDocParamsId,
                ...KnowledgeBaseDocParamsKnowledgeBaseId,
                ...KnowledgeBaseDocParamsFolderId,
            ],
            bodyType: ENUM_DOC_REQUEST_BODY_TYPE.JSON,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ policy: true }),
        DocResponse('knowledge-base.folder.update')
    );
}

export function KnowledgeItemFolderWorkspaceDeleteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'delete a folder (cannot delete root folder)',
        }),
        DocRequest({
            params: [
                ...WorkspaceDocParamsId,
                ...KnowledgeBaseDocParamsKnowledgeBaseId,
                ...KnowledgeBaseDocParamsFolderId,
            ],
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ policy: true }),
        DocResponse('knowledge-base.folder.delete', {
            httpStatus: HttpStatus.NO_CONTENT,
        })
    );
}
