import { HttpStatus, applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from 'src/common/doc/decorators/doc.decorator';
import { WorkspaceDocParamsId } from 'src/modules/workspace/constants/workspace.doc.constant';
import {
    KnowledgeBaseDocParamsKnowledgeBaseId,
    KnowledgeBaseDocParamsTagId,
} from '../constants/knowledge-base.doc.constant';

export function KnowledgeItemTagWorkspaceListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'list all tags in a knowledge base',
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
        DocGuard({ policy: true, role: true }),
        DocResponsePaging<any>('knowledge-base.tag.list', {
            dto: Array<string>,
        })
    );
}

export function KnowledgeItemTagWorkspaceDeleteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'delete a tag from a knowledge base',
        }),
        DocRequest({
            params: [
                ...WorkspaceDocParamsId,
                ...KnowledgeBaseDocParamsKnowledgeBaseId,
                ...KnowledgeBaseDocParamsTagId,
            ],
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ policy: true }),
        DocResponse('knowledge-base.tag.delete', {
            httpStatus: HttpStatus.NO_CONTENT,
        })
    );
}
