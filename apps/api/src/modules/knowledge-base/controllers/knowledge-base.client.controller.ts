import { PaginationQuery } from '@app/common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from '@app/common/pagination/dtos/pagination.list.dto';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from '@app/common/pagination/enums/pagination.enum';
import { PaginationService } from '@app/common/pagination/services/pagination.service';
import {
    Response,
    ResponsePaging,
} from '@app/common/response/decorators/response.decorator';
import {
    IResponse,
    IResponsePaging,
} from '@app/common/response/interfaces/response.interface';
import { ENUM_ACTIVITY_ACTION } from '@app/modules/activity/enums/activity.enum';
import { ActivityService } from '@app/modules/activity/services/activity.service';
import {
    ClientCredentialPayload,
    ClientCredentialProtected,
} from '@app/modules/client-credential/decorators/client-credential.decorator';
import { ClientCredentialEntity } from '@app/modules/client-credential/repository/entities/client-credential.entity';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from '@app/modules/policy/enums/policy.enum';
import { WorkspacePayload } from '@app/modules/workspace/decorators/workspace.decorator';
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
    KnowledgeBaseClientListDoc,
    KnowledgeBaseClientUpdateDoc,
} from '../docs/knowledge-base.client.doc';
import { KnowledgeBaseUpdateRequestDto } from '../dtos/request/knowledge-base.update.request.dto';
import { KnowledgeBaseResponseDto } from '../dtos/response/knowledge-base.response.dto';
import { KnowledgeBaseService } from '../services/knowledge-base.service';

// 3rd-party surface: authenticated by x-api-key (ClientCredential), tenant
// derived from the credential (no :workspace param). See ADR-0012. Writes
// act as the credential's creator, in the records and the activity log.
@ApiTags('modules.client.knowledgeBase')
@Controller('/knowledge-bases')
export class KnowledgeBaseClientController {
    constructor(
        private readonly knowledgeBaseService: KnowledgeBaseService,
        private readonly paginationService: PaginationService,
        private readonly activityService: ActivityService
    ) {}

    @KnowledgeBaseClientListDoc()
    @ResponsePaging('knowledgeBase.list')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.KNOWLEDGE_BASE,
        action: [ENUM_POLICY_ACTION.READ],
    })
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

    @KnowledgeBaseClientUpdateDoc()
    @Response('knowledgeBase.update')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.KNOWLEDGE_BASE,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @Put('/:knowledgeBaseId')
    async update(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @ClientCredentialPayload() credential: ClientCredentialEntity,
        @Param('knowledgeBaseId') knowledgeBaseId: string,
        @Body() dto: KnowledgeBaseUpdateRequestDto
    ): Promise<IResponse<KnowledgeBaseResponseDto>> {
        // 404s a knowledge base outside the workspace.
        const knowledgeBase = await this.knowledgeBaseService.update(
            knowledgeBaseId,
            workspace.id,
            dto,
            { actionBy: credential.createdBy.id }
        );
        await this.log(ENUM_ACTIVITY_ACTION.UPDATE, credential, knowledgeBase);

        return { data: this.knowledgeBaseService.mapGet(knowledgeBase) };
    }

    private async log(
        action: ENUM_ACTIVITY_ACTION,
        credential: ClientCredentialEntity,
        knowledgeBase: { id: string; name: string }
    ): Promise<void> {
        await this.activityService.createByUser(credential.createdBy, {
            action,
            subject: ENUM_POLICY_SUBJECT.KNOWLEDGE_BASE,
            metadata: {
                knowledgeBaseId: knowledgeBase.id,
                knowledgeBaseName: knowledgeBase.name,
            },
        });
    }
}
