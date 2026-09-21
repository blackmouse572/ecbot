import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from 'src/common/doc/decorators/doc.decorator';
import {
    RAGDocAdminListQuery,
    RAGDocParamsId,
} from '../constants/rag.doc.constant';
import { RAGGetResponseDto } from '../dtos/response/rag.get.response.dto';
import { RAGAdminListReponseDto } from '../dtos/response/rag.list.response.dto';

export function RAGAdminListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get all RAG files (admin)',
            description:
                'Admin endpoint to retrieve a paginated list of all RAG files across all workspaces and chatbots with filtering capabilities.',
        }),
        DocRequest({
            queries: [...RAGDocAdminListQuery],
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({
            role: true,
            policy: true,
        }),
        DocResponsePaging<RAGAdminListReponseDto>('rag.list', {
            dto: RAGAdminListReponseDto,
        })
    );
}

export function RAGAdminGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get RAG file details (admin)',
            description:
                'Admin endpoint to retrieve detailed information about any RAG file across all workspaces.',
        }),
        DocRequest({
            params: RAGDocParamsId,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({
            role: true,
            policy: true,
        }),
        DocResponse<RAGGetResponseDto>('rag.get', {
            dto: RAGGetResponseDto,
        })
    );
}

export function RAGAdminDeleteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'delete RAG file (super admin only)',
            description:
                'Super admin endpoint to permanently delete any RAG file. This action cannot be undone.',
        }),
        DocRequest({
            params: RAGDocParamsId,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({
            role: true,
            policy: true,
        }),
        DocResponse('rag.delete', {
            httpStatus: HttpStatus.OK,
        })
    );
}
