import { ENUM_APP_STATUS_CODE_ERROR } from '@app/app/enums/app.status-code.enum';
import {
    PaginationQuery,
    PaginationQueryFilterContainInArray,
    PaginationQueryFilterInEnum,
} from '@app/common/pagination/decorators/pagination.decorator';
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
import { ENUM_AWS_S3_ACCESSIBILITY } from '@app/modules/aws/enums/aws.enum';
import { AwsS3Service } from '@app/modules/aws/services/aws.s3.service';
import { ClientCredentialProtected } from '@app/modules/client-credential/decorators/client-credential.decorator';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from '@app/modules/policy/enums/policy.enum';
import { WorkspacePayload } from '@app/modules/workspace/decorators/workspace.decorator';
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import { PopulateHint } from '@mikro-orm/postgresql';
import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
    KnowledgeItemClientGetDoc,
    KnowledgeItemClientListDoc,
} from '../docs/knowledge-item.client.doc';
import { KnowledgeItemResponseDto } from '../dtos/response/knowledge-item.response.dto';
import {
    ENUM_KNOWLEDGE_BASE_ITEM_STATUS,
    ENUM_KNOWLEDGE_BASE_ITEM_STATUSES,
} from '../enums/knowledge-base-item-status.enum';
import {
    ENUM_KNOWLEDGE_BASE_ITEM_TYPE,
    ENUM_KNOWLEDGE_BASE_ITEM_TYPES,
} from '../enums/knowledge-base-item-type.enum';
import { KnowledgeBaseService } from '../services/knowledge-base.service';
import { KnowledgeItemService } from '../services/knowledge-item.service';

// 3rd-party surface: authenticated by x-api-key (ClientCredential), tenant
// derived from the credential (no :workspace param). See ADR-0012.
@ApiTags('modules.client.knowledgeItem')
@Controller('/knowledge-bases/:knowledgeBaseId/items')
export class KnowledgeItemClientController {
    constructor(
        private readonly knowledgeItemService: KnowledgeItemService,
        private readonly knowledgeBaseService: KnowledgeBaseService,
        private readonly paginationService: PaginationService,
        private readonly awsS3Service: AwsS3Service
    ) {}

    @KnowledgeItemClientListDoc()
    @ResponsePaging('knowledgeItem.list')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.KNOWLEDGE_BASE,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @Get('/')
    async list(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('knowledgeBaseId') knowledgeBaseId: string,
        @PaginationQuery({
            availableSearch: ['title'],
            availableOrderBy: ['createdAt', 'updatedAt', 'status', 'type'],
            defaultOrderBy: 'createdAt',
            defaultOrderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC,
        })
        { _search, _limit, _offset, _order }: PaginationListDto,
        @PaginationQueryFilterInEnum(
            'type',
            ENUM_KNOWLEDGE_BASE_ITEM_TYPES,
            ENUM_KNOWLEDGE_BASE_ITEM_TYPE
        )
        type: Record<string, any>,
        @PaginationQueryFilterInEnum(
            'status',
            ENUM_KNOWLEDGE_BASE_ITEM_STATUSES,
            ENUM_KNOWLEDGE_BASE_ITEM_STATUS
        )
        status: Record<string, any>,
        @PaginationQueryFilterContainInArray('tags.tag', undefined, {
            queryField: 'tags',
        })
        tags: Record<string, any>
    ): Promise<IResponsePaging<KnowledgeItemResponseDto>> {
        await this.findKnowledgeBaseOrFail(workspace, knowledgeBaseId);

        const find: Record<string, any> = {
            ..._search,
            ...type,
            ...status,
            ...tags,
            knowledgeBase: knowledgeBaseId,
            deletedAt: null,
        };
        const [data, total] = await Promise.all([
            this.knowledgeItemService.find(find, {
                limit: _limit,
                offset: _offset,
                order: _order,
                populate: ['folder', 'tags', 'createdBy', 'updatedBy'],
                populateWhere: PopulateHint.INFER,
            }),
            this.knowledgeItemService.getTotal(find),
        ]);

        return {
            _pagination: {
                total,
                totalPage: this.paginationService.totalPage(total, _limit),
            },
            data: this.knowledgeItemService.mapList(data),
        };
    }

    @KnowledgeItemClientGetDoc()
    @Response('knowledgeItem.get')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.KNOWLEDGE_BASE,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @Get('/:id')
    async get(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('knowledgeBaseId') knowledgeBaseId: string,
        @Param('id') id: string
    ): Promise<IResponse<KnowledgeItemResponseDto>> {
        await this.findKnowledgeBaseOrFail(workspace, knowledgeBaseId);

        const item = await this.knowledgeItemService.findOne(
            { id, knowledgeBase: knowledgeBaseId, deletedAt: null },
            { populate: ['createdBy', 'updatedBy', 'tags'] }
        );
        if (!item) {
            throw new NotFoundException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'knowledgeItem.error.notFound',
            });
        }

        // The stored URL is private; hand out a short-lived signed one.
        if (item.attachment) {
            const signed = await this.awsS3Service.presignGetItem(
                item.attachment.key,
                { access: ENUM_AWS_S3_ACCESSIBILITY.PRIVATE }
            );
            item.attachment.cdnUrl =
                signed?.presignUrl ?? item.attachment.cdnUrl;
        }

        return { data: this.knowledgeItemService.mapGet(item) };
    }

    private async findKnowledgeBaseOrFail(
        workspace: WorkspaceEntity,
        knowledgeBaseId: string
    ): Promise<void> {
        const knowledgeBase = await this.knowledgeBaseService.findOne({
            id: knowledgeBaseId,
            workspace: workspace.id,
            deletedAt: null,
        });

        if (!knowledgeBase) {
            throw new NotFoundException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'knowledgeBase.error.notFound',
            });
        }
    }
}
