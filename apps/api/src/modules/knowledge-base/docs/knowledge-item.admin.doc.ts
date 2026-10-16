import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from '@app/common/doc/decorators/doc.decorator';
import { applyDecorators } from '@nestjs/common';
import {
    KnowledgeItemAdminDocParamsId,
    KnowledgeItemAdminDocQueryFilters,
} from '../constants/knowledge-base.doc.constant';
import { KnowledgeItemAdminGetResponseDto } from '../dtos/response/knowledge-item.admin-get.response.dto';
import { KnowledgeItemAdminListResponseDto } from '../dtos/response/knowledge-item.admin-list.response.dto';

export function KnowledgeItemAdminListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'list knowledge items across every workspace, newest first',
        }),
        DocRequest({ queries: [...KnowledgeItemAdminDocQueryFilters] }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ role: true, policy: true }),
        DocResponsePaging<KnowledgeItemAdminListResponseDto>(
            'knowledgeItem.list',
            { dto: KnowledgeItemAdminListResponseDto }
        )
    );
}

export function KnowledgeItemAdminGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'get one knowledge item with its source, chunk count and linked chatbots',
        }),
        DocRequest({ params: [...KnowledgeItemAdminDocParamsId] }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ role: true, policy: true }),
        DocResponse('knowledgeItem.get', {
            dto: KnowledgeItemAdminGetResponseDto,
        })
    );
}

export function KnowledgeItemAdminDeleteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'delete a knowledge item and its chunks, logged on the workspace owner',
        }),
        DocRequest({ params: [...KnowledgeItemAdminDocParamsId] }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ role: true, policy: true }),
        DocResponse('knowledgeItem.delete')
    );
}

export function KnowledgeItemAdminReprocessDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'queue a knowledge item for processing again, logged on the workspace owner',
        }),
        DocRequest({ params: [...KnowledgeItemAdminDocParamsId] }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ role: true, policy: true }),
        DocResponse('knowledgeItem.reprocess')
    );
}
