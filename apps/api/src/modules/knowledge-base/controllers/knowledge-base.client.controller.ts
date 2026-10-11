import { PaginationQuery } from '@app/common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from '@app/common/pagination/dtos/pagination.list.dto';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from '@app/common/pagination/enums/pagination.enum';
import { PaginationService } from '@app/common/pagination/services/pagination.service';
import { ResponsePaging } from '@app/common/response/decorators/response.decorator';
import { IResponsePaging } from '@app/common/response/interfaces/response.interface';
import { ClientCredentialProtected } from '@app/modules/client-credential/decorators/client-credential.decorator';
import { WorkspacePayload } from '@app/modules/workspace/decorators/workspace.decorator';
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { KnowledgeBaseClientListDoc } from '../docs/knowledge-base.client.doc';
import { KnowledgeBaseResponseDto } from '../dtos/response/knowledge-base.response.dto';
import { KnowledgeBaseService } from '../services/knowledge-base.service';

// 3rd-party surface: authenticated by x-api-key (ClientCredential), tenant
// derived from the credential (no :workspace param). See ADR-0012.
@ApiTags('modules.client.knowledgeBase')
@Controller('/knowledge-bases')
export class KnowledgeBaseClientController {
    constructor(
        private readonly knowledgeBaseService: KnowledgeBaseService,
        private readonly paginationService: PaginationService
    ) {}

    @KnowledgeBaseClientListDoc()
    @ResponsePaging('knowledgeBase.list')
    @ClientCredentialProtected()
    @Get('/')
    async list(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @PaginationQuery({
            availableSearch: ['name'],
            availableOrderBy: ['createdAt', 'updatedAt'],
            defaultOrderBy: 'createdAt',
            defaultOrderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC,
        })
        { _search, _limit, _offset, _order }: PaginationListDto
    ): Promise<IResponsePaging<KnowledgeBaseResponseDto>> {
        const find: Record<string, any> = {
            ..._search,
            workspace: workspace.id,
            deletedAt: null,
        };

        const [data, total] = await Promise.all([
            this.knowledgeBaseService.find(find, {
                limit: _limit,
                offset: _offset,
                order: _order,
            }),
            this.knowledgeBaseService.getTotal(find),
        ]);

        return {
            _pagination: {
                total,
                totalPage: this.paginationService.totalPage(total, _limit),
            },
            data: this.knowledgeBaseService.mapList(data),
        };
    }
}
