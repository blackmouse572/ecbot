import { ENUM_APP_STATUS_CODE_ERROR } from '@app/app/enums/app.status-code.enum';
import { ENUM_REQUEST_STATUS_CODE_ERROR } from '@app/common/request/enums/request.status-code.enum';
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
import { ENUM_ACTIVITY_ACTION } from '@app/modules/activity/enums/activity.enum';
import { ActivityService } from '@app/modules/activity/services/activity.service';
import { ENUM_AWS_S3_ACCESSIBILITY } from '@app/modules/aws/enums/aws.enum';
import { AwsS3Service } from '@app/modules/aws/services/aws.s3.service';
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
import { PopulateHint } from '@mikro-orm/postgresql';
import {
    Body,
    Controller,
    Delete,
    Get,
    NotFoundException,
    Param,
    Post,
    Put,
    UnprocessableEntityException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import {
    KnowledgeItemClientCreateDoc,
    KnowledgeItemClientUploadUrlDoc,
    KnowledgeItemClientDeleteDoc,
    KnowledgeItemClientGetDoc,
    KnowledgeItemClientListDoc,
    KnowledgeItemClientUpdateDoc,
} from '../docs/knowledge-item.client.doc';
import { DatabaseIdResponseDto } from 'src/common/database/dtos/response/database.id.response.dto';
import { KnowledgeItemClientCreateRequestDto } from '../dtos/request/knowledge-item.client-create.request.dto';
import { KnowledgeItemUploadUrlRequestDto } from '../dtos/request/knowledge-item.upload-url.request.dto';
import { KnowledgeItemUploadUrlResponseDto } from '../dtos/response/knowledge-item.upload-url.response.dto';
import { KnowledgeItemUploadService } from '../services/knowledge-item-upload.service';
import { KnowledgeItemUpdateRequestDto } from '../dtos/request/knowledge-item.update.request.dto';
import { KnowledgeItemResponseDto } from '../dtos/response/knowledge-item.response.dto';
import { KnowledgeItemShortResponseDto } from '../dtos/response/knowledge-item-short.response.dto';
import {
    ENUM_KNOWLEDGE_BASE_ITEM_STATUS,
    ENUM_KNOWLEDGE_BASE_ITEM_STATUSES,
} from '../enums/knowledge-base-item-status.enum';
import {
    ENUM_KNOWLEDGE_BASE_ITEM_TYPE,
    ENUM_KNOWLEDGE_BASE_ITEM_TYPES,
} from '../enums/knowledge-base-item-type.enum';
import { KnowledgeBaseService } from '../services/knowledge-base.service';
import { KnowledgeItemFolderService } from '../services/knowledge-item-folder.service';
import { KnowledgeItemService } from '../services/knowledge-item.service';
import { KnowledgeItemEntity } from '../repository/entities/knowledge-item.entity';

// 3rd-party surface: authenticated by x-api-key (ClientCredential), tenant
// derived from the credential (no :workspace param). See ADR-0012. Writes
// act as the credential's creator, in the records and the activity log.
// Files come as JSON: a presigned upload's key, or a public link.
@ApiTags('modules.client.knowledgeItem')
@Controller('/knowledge-bases/:knowledgeBaseId/items')
export class KnowledgeItemClientController {
    constructor(
        private readonly knowledgeItemService: KnowledgeItemService,
        private readonly knowledgeBaseService: KnowledgeBaseService,
        private readonly paginationService: PaginationService,
        private readonly awsS3Service: AwsS3Service,
        private readonly knowledgeItemFolderService: KnowledgeItemFolderService,
        private readonly activityService: ActivityService,
        private readonly knowledgeItemUploadService: KnowledgeItemUploadService
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

        // The stored URL is private; hand out a short-lived signed one. Media
        // is already public.
        if (
            item.attachment &&
            item.type !== ENUM_KNOWLEDGE_BASE_ITEM_TYPE.MEDIA
        ) {
            const signed = await this.awsS3Service.presignGetItem(
                item.attachment.key,
                { access: ENUM_AWS_S3_ACCESSIBILITY.PRIVATE }
            );
            item.attachment.cdnUrl =
                signed?.presignUrl ?? item.attachment.cdnUrl;
        }

        return { data: this.knowledgeItemService.mapGet(item) };
    }

    @KnowledgeItemClientUploadUrlDoc()
    @Response('knowledgeItem.uploadUrl')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.KNOWLEDGE_BASE,
        action: [ENUM_POLICY_ACTION.CREATE],
    })
    @Post('/upload-url')
    async uploadUrl(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('knowledgeBaseId') knowledgeBaseId: string,
        @Body() { type, fileName, size }: KnowledgeItemUploadUrlRequestDto
    ): Promise<IResponse<KnowledgeItemUploadUrlResponseDto>> {
        await this.findKnowledgeBaseOrFail(workspace, knowledgeBaseId);
        const upload = await this.knowledgeItemUploadService.createUploadUrl(
            workspace.id,
            knowledgeBaseId,
            type,
            fileName,
            size
        );
        return {
            data: plainToInstance(KnowledgeItemUploadUrlResponseDto, upload, {
                excludeExtraneousValues: true,
            }),
        };
    }

    @KnowledgeItemClientCreateDoc()
    @Response('knowledgeItem.create')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.KNOWLEDGE_BASE,
        action: [ENUM_POLICY_ACTION.CREATE],
    })
    @Post('/')
    async create(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @ClientCredentialPayload() credential: ClientCredentialEntity,
        @Param('knowledgeBaseId') knowledgeBaseId: string,
        @Body()
        {
            folderId,
            fileKey,
            fileUrl,
            ...dto
        }: KnowledgeItemClientCreateRequestDto
    ): Promise<IResponse<KnowledgeItemShortResponseDto>> {
        // A FILE or MEDIA item takes its file from exactly one of the two;
        // other items take neither.
        const takesFile =
            dto.type === ENUM_KNOWLEDGE_BASE_ITEM_TYPE.FILE ||
            dto.type === ENUM_KNOWLEDGE_BASE_ITEM_TYPE.MEDIA;
        if (takesFile !== (!!fileKey !== !!fileUrl) || (fileKey && fileUrl)) {
            throw new UnprocessableEntityException({
                statusCode: ENUM_REQUEST_STATUS_CODE_ERROR.VALIDATION,
                message: 'knowledgeItem.error.fileSource',
            });
        }
        await this.findKnowledgeBaseOrFail(workspace, knowledgeBaseId);

        const folder = folderId
            ? await this.knowledgeItemFolderService.findOne({
                  id: folderId,
                  knowledgeBase: knowledgeBaseId,
              })
            : undefined;
        if (folderId && !folder) {
            throw new NotFoundException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'knowledgeItemFolder.error.notFound',
            });
        }

        const stored = takesFile
            ? await this.knowledgeItemUploadService.store(
                  workspace.id,
                  knowledgeBaseId,
                  dto.type,
                  fileKey
                      ? await this.knowledgeItemUploadService.readUpload(
                            workspace.id,
                            knowledgeBaseId,
                            fileKey
                        )
                      : await this.knowledgeItemUploadService.download(fileUrl)
              )
            : undefined;

        const item = await this.knowledgeItemService.create(
            {
                ...dto,
                ...stored,
                folder,
                knowledgeBase: knowledgeBaseId,
                workspace: workspace.id,
            },
            { actionBy: credential.createdBy.id }
        );
        if (fileKey)
            await this.knowledgeItemUploadService.discardUpload(fileKey);
        await this.log(
            ENUM_ACTIVITY_ACTION.CREATE,
            credential,
            knowledgeBaseId,
            item
        );

        return { data: this.knowledgeItemService.mapShort(item) };
    }

    @KnowledgeItemClientUpdateDoc()
    @Response('knowledgeItem.update')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.KNOWLEDGE_BASE,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @Put('/:id')
    async update(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @ClientCredentialPayload() credential: ClientCredentialEntity,
        @Param('knowledgeBaseId') knowledgeBaseId: string,
        @Param('id') id: string,
        @Body() dto: KnowledgeItemUpdateRequestDto
    ): Promise<IResponse<KnowledgeItemShortResponseDto>> {
        await this.findKnowledgeBaseOrFail(workspace, knowledgeBaseId);
        const item = await this.findItemOrFail(knowledgeBaseId, id);

        // Setting status READY queues the item for processing.
        const updated = await this.knowledgeItemService.update(item.id, dto, {
            actionBy: credential.createdBy.id,
        });
        await this.log(
            ENUM_ACTIVITY_ACTION.UPDATE,
            credential,
            knowledgeBaseId,
            item
        );

        return { data: this.knowledgeItemService.mapShort(updated) };
    }

    @KnowledgeItemClientDeleteDoc()
    @Response('knowledgeItem.delete')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.KNOWLEDGE_BASE,
        action: [ENUM_POLICY_ACTION.DELETE],
    })
    @Delete('/:id')
    async delete(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @ClientCredentialPayload() credential: ClientCredentialEntity,
        @Param('knowledgeBaseId') knowledgeBaseId: string,
        @Param('id') id: string
    ): Promise<IResponse<DatabaseIdResponseDto>> {
        await this.findKnowledgeBaseOrFail(workspace, knowledgeBaseId);
        const item = await this.findItemOrFail(knowledgeBaseId, id);

        await this.knowledgeItemService.softDelete(item.id, {
            actionBy: credential.createdBy.id,
        });
        await this.log(
            ENUM_ACTIVITY_ACTION.DELETE,
            credential,
            knowledgeBaseId,
            item
        );

        return { data: { id: item.id } };
    }

    private async findItemOrFail(
        knowledgeBaseId: string,
        id: string
    ): Promise<KnowledgeItemEntity> {
        const item = await this.knowledgeItemService.findOne({
            id,
            knowledgeBase: knowledgeBaseId,
            deletedAt: null,
        });
        if (!item) {
            throw new NotFoundException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'knowledgeItem.error.notFound',
            });
        }
        return item;
    }

    private async log(
        action: ENUM_ACTIVITY_ACTION,
        credential: ClientCredentialEntity,
        knowledgeBaseId: string,
        item: KnowledgeItemEntity
    ): Promise<void> {
        await this.activityService.createByUser(credential.createdBy, {
            action,
            subject: ENUM_POLICY_SUBJECT.KNOWLEDGE_BASE,
            metadata: {
                knowledgeBaseId,
                itemId: item.id,
                itemType: item.type,
                itemTitle: item.title,
            },
        });
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
