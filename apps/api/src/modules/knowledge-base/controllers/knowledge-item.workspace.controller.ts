import {
    PaginationQuery,
    PaginationQueryFilterContainInArray,
    PaginationQueryFilterInEnum,
} from '@app/common/pagination/decorators/pagination.decorator';
import { BatchIdsRequestDto } from '@app/common/batch/dtos/batch.request.dto';
import { BatchResultResponseDto } from '@app/common/batch/dtos/batch.response.dto';
import { runBatch } from '@app/common/batch/utils/run-batch.util';
import { PaginationListDto } from '@app/common/pagination/dtos/pagination.list.dto';
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
import { EntityManager, PopulateHint } from '@mikro-orm/postgresql';
import {
    Body,
    ConflictException,
    Controller,
    Delete,
    Get,
    InternalServerErrorException,
    Logger,
    NotFoundException,
    Param,
    Post,
    Put,
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import slugify from 'slugify';
import { ENUM_APP_STATUS_CODE_ERROR } from 'src/app/enums/app.status-code.enum';
import { DatabaseIdResponseDto } from 'src/common/database/dtos/response/database.id.response.dto';
import { AwsS3Service } from 'src/modules/aws/services/aws.s3.service';
import { ActivityService } from 'src/modules/activity/services/activity.service';
import { ApiKeyProtected } from 'src/modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from 'src/modules/auth/decorators/auth.jwt.decorator';
import { IAuthJwtAccessTokenPayload } from 'src/modules/auth/interfaces/auth.interface';
import { PolicyRoleProtected } from 'src/modules/policy/decorators/policy.decorator';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from 'src/modules/policy/enums/policy.enum';
import { UserProtected } from 'src/modules/user/decorators/user.decorator';
import { UserActiveParsePipe } from 'src/modules/user/pipes/user.parse.pipe';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import {
    WorkspacePayload,
    WorkspacePolicyAbilityProtected,
} from 'src/modules/workspace/decorators/workspace.decorator';
import { WorkspaceEntity } from 'src/modules/workspace/repository/entities/workspace.entity';
import {
    KnowledgeItemWorkspaceBatchDeleteDoc,
    KnowledgeItemWorkspaceBatchProcessDoc,
    KnowledgeItemWorkspaceCreateDoc,
    KnowledgeItemWorkspaceDeleteDoc,
    KnowledgeItemWorkspaceGetDoc,
    KnowledgeItemWorkspaceListDoc,
    KnowledgeItemWorkspaceUpdateDoc,
} from '../docs/knowledge-item.workspace.doc';
import { KnowledgeItemCreateRequestDto } from '../dtos/request/knowledge-item.create.request.dto';
import { KnowledgeItemUpdateRequestDto } from '../dtos/request/knowledge-item.update.request.dto';
import { KnowledgeItemResponseDto } from '../dtos/response/knowledge-item.response.dto';
import {
    ENUM_KNOWLEDGE_BASE_ITEM_STATUS,
    ENUM_KNOWLEDGE_BASE_ITEM_STATUSES,
} from '../enums/knowledge-base-item-status.enum';
import {
    ENUM_KNOWLEDGE_BASE_ITEM_TYPE,
    ENUM_KNOWLEDGE_BASE_ITEM_TYPES,
} from '../enums/knowledge-base-item-type.enum';
import { KnowledgeItemEntity } from '../repository/entities/knowledge-item.entity';
import { KnowledgeBaseService } from '../services/knowledge-base.service';
import { KnowledgeIngestService } from '../services/knowledge-ingest.service';
import { KnowledgeItemService } from '../services/knowledge-item.service';
import { KnowledgeItemFolderService } from '../services/knowledge-item-folder.service';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from '../../../common/pagination/enums/pagination.enum';
import { FileTypePipe } from '../../../common/file/pipes/file.type.pipe';
import { ENUM_FILE_MIME_DOCUMENT } from '@app/common/file/enums/file.enum';
import { AwsS3Entity } from '../../aws/repository/entities/aws.s3.entity';
import { ENUM_AWS_S3_ACCESSIBILITY } from '../../aws/enums/aws.enum';

@ApiTags('modules.workspace.knowledge-item')
@Controller({
    version: '1',
    path: ':workspace/knowledge-bases/:knowledgeBaseId/items',
})
export class KnowledgeItemWorkspaceController {
    constructor(
        private readonly em: EntityManager,
        private readonly knowledgeItemService: KnowledgeItemService,
        private readonly knowledgeBaseService: KnowledgeBaseService,
        private readonly paginationService: PaginationService,
        private readonly activityService: ActivityService,
        private readonly knowledgeItemFolderService: KnowledgeItemFolderService,
        private readonly awsS3Service: AwsS3Service,
        private readonly knowledgeIngestService: KnowledgeIngestService
    ) {}

    private readonly logger = new Logger(KnowledgeItemWorkspaceController.name);

    @KnowledgeItemWorkspaceListDoc()
    @ResponsePaging('knowledgeItem.list')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.KNOWLEDGE_BASE,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
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
            // raw: true,
            queryField: 'tags',
        })
        tags: Record<string, any>
    ): Promise<IResponsePaging<KnowledgeItemResponseDto>> {
        const find: Record<string, any> = {
            ..._search,
            ...type,
            ...status,
            ...tags,
        };
        // Verify knowledge base exists in workspace
        const knowledgeBase = await this.knowledgeBaseService.findOne({
            id: knowledgeBaseId,
            workspace: workspace.id,
        });

        if (!knowledgeBase) {
            throw new NotFoundException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'knowledgeBase.error.notFound',
            });
        }
        const [data, total] = await Promise.all([
            this.knowledgeItemService.find(
                {
                    ...find,
                    knowledgeBase: knowledgeBaseId,
                    deletedAt: null,
                },
                {
                    limit: _limit,
                    offset: _offset,
                    order: _order,
                    populate: ['folder', 'tags', 'createdBy', 'updatedBy'],
                    populateWhere: PopulateHint.INFER,
                }
            ),
            this.knowledgeItemService.getTotal({
                ...find,
                knowledgeBase: knowledgeBaseId,
                deletedAt: null,
            }),
        ]);

        const totalPage: number = this.paginationService.totalPage(
            total,
            _limit
        );

        return {
            data: this.knowledgeItemService.mapList(data),
            _pagination: {
                total,
                totalPage,
            },
        };
    }

    @KnowledgeItemWorkspaceGetDoc()
    @Response('knowledgeItem.get')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.KNOWLEDGE_BASE,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/:id')
    async get(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('knowledgeBaseId') knowledgeBaseId: string,
        @Param('id') id: string
    ): Promise<IResponse<KnowledgeItemResponseDto>> {
        // Verify knowledge base exists in workspace
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

        const item = await this.knowledgeItemService.findOne(
            {
                id,
                knowledgeBase: knowledgeBaseId,
                deletedAt: null,
            },
            {
                populate: ['createdBy', 'updatedBy', 'tags'],
            }
        );

        // If item has attachment, generate signed URL for preview
        if (item?.attachment) {
            const signedPreviewUrl = item.attachment
                ? await this.awsS3Service.presignGetItem(item.attachment.key, {
                      access: ENUM_AWS_S3_ACCESSIBILITY.PRIVATE, // Internal doc, use private access
                  })
                : null;

            item.attachment.cdnUrl = signedPreviewUrl
                ? signedPreviewUrl?.presignUrl
                : item.attachment?.cdnUrl;
        }

        if (!item) {
            throw new NotFoundException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'knowledgeItem.error.notFound',
            });
        }

        return {
            data: this.knowledgeItemService.mapGet(item),
        };
    }

    @KnowledgeItemWorkspaceCreateDoc()
    @Response('knowledgeItem.create')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.KNOWLEDGE_BASE,
        action: [ENUM_POLICY_ACTION.CREATE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/create')
    @UseInterceptors(
        FileInterceptor('file', {
            storage: multer.memoryStorage(),
            limits: {
                fileSize: 5 * 1024 * 1024,
                files: 1,
            },
        })
    )
    @ApiConsumes('multipart/form-data')
    async create(
        @AuthJwtPayload<IAuthJwtAccessTokenPayload>('user', UserActiveParsePipe)
        user: UserEntity,
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('knowledgeBaseId') knowledgeBaseId: string,
        @Body() dto: KnowledgeItemCreateRequestDto,
        @UploadedFile(
            new FileTypePipe([
                ENUM_FILE_MIME_DOCUMENT.DOCX,
                ENUM_FILE_MIME_DOCUMENT.PDF,
                ENUM_FILE_MIME_DOCUMENT.MD,
                ENUM_FILE_MIME_DOCUMENT.TXT,
                ENUM_FILE_MIME_DOCUMENT.HTML,
            ])
        )
        file?: Express.Multer.File
    ): Promise<IResponse<DatabaseIdResponseDto>> {
        const session = this.em.fork();
        await session.begin();

        try {
            // Verify knowledge base exists in workspace
            const knowledgeBase = await this.knowledgeBaseService.findOne({
                id: knowledgeBaseId,
                workspace: workspace.id,
                deletedAt: null,
            });

            const folder = await this.knowledgeItemFolderService.findOne({
                id: dto.folderId,
                knowledgeBase: knowledgeBaseId,
            });

            if (!knowledgeBase) {
                throw new NotFoundException({
                    statusCode: ENUM_APP_STATUS_CODE_ERROR.NOT_FOUND,
                    message: 'knowledgeBase.error.notFound',
                });
            } else if (dto.folderId && !folder) {
                throw new NotFoundException({
                    statusCode: ENUM_APP_STATUS_CODE_ERROR.NOT_FOUND,
                    message: 'knowledgeItemFolder.error.notFound',
                });
            }

            // Upload file to S3 if type is FILE
            let attachment: AwsS3Entity = undefined;
            let metadata: Record<string, any> = {};
            if (dto.type === ENUM_KNOWLEDGE_BASE_ITEM_TYPE.FILE && file) {
                // Sanitize filename using slugify to remove special characters
                const nameWithoutExt = file.originalname.replace(
                    /\.[^/.]+$/,
                    ''
                );
                const ext = file.originalname.split('.').pop();
                const sanitizedName = slugify(nameWithoutExt, {
                    lower: true,
                    strict: true,
                    remove: /[*+~.()'"!:@]/g,
                    trim: true,
                });
                const safeFileName = `${sanitizedName}.${ext}`;

                const key = `knowledge-items/${workspace.id}/${knowledgeBaseId}/${Date.now()}-${safeFileName}`;
                this.logger.debug(
                    `Uploading file to S3 with key: ${key}, original filename: ${file.originalname}, sanitized filename: ${safeFileName}`
                );

                try {
                    const uploaded = await this.awsS3Service.putItem(
                        {
                            key,
                            file: file.buffer,
                            size: file.size,
                        },
                        {
                            access: ENUM_AWS_S3_ACCESSIBILITY.PRIVATE,
                        }
                    );

                    attachment = {
                        bucket: uploaded.bucket,
                        key: uploaded.key,
                        completedUrl: uploaded.completedUrl,
                        cdnUrl: uploaded.cdnUrl,
                        mime: file.mimetype,
                        size: file.size,
                        extension: ext,
                    };

                    metadata = {
                        fileName: safeFileName,
                        mimeType: file.mimetype,
                    };
                } catch (error) {
                    this.logger.error(
                        `Failed to upload file to S3: ${error instanceof Error ? error.message : JSON.stringify(error)}`
                    );
                    throw new InternalServerErrorException({
                        statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                        message: 'knowledgeItem.error.uploadFailed',
                        _error:
                            error instanceof Error
                                ? error.message
                                : 'Unknown error',
                    });
                }
            }

            const item = await this.knowledgeItemService.create(
                {
                    ...dto,
                    metadata,
                    attachment,
                    folder,
                    knowledgeBase: knowledgeBaseId,
                    workspace: workspace.id,
                },
                {
                    em: session,
                    actionBy: user.id,
                }
            );

            await this.activityService.createByUser(
                user,
                {
                    action: ENUM_ACTIVITY_ACTION.CREATE,
                    subject: ENUM_POLICY_SUBJECT.KNOWLEDGE_BASE,
                    metadata: {
                        knowledgeBaseId,
                        itemId: item.id,
                        itemType: item.type,
                        itemTitle: item.title,
                    },
                },
                { em: session }
            );

            await session.commit();

            return {
                data: this.knowledgeItemService.mapShort(item),
            };
        } catch (err: unknown) {
            await session.rollback();

            if (err instanceof NotFoundException) {
                this.logger.error(
                    `Create knowledge item failed, knowledge base ${knowledgeBaseId} not found in workspace ${workspace.id}`
                );
                throw err;
            }
            this.logger.error(
                `Create knowledge item failed, unexpected error: ${err instanceof Error ? err.stack : JSON.stringify(err)}`
            );
            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    @KnowledgeItemWorkspaceUpdateDoc()
    @Response('knowledgeItem.update')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.KNOWLEDGE_BASE,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/:id/update')
    async update(
        @AuthJwtPayload<IAuthJwtAccessTokenPayload>('user', UserActiveParsePipe)
        user: UserEntity,
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('knowledgeBaseId') knowledgeBaseId: string,
        @Param('id') id: string,
        @Body() dto: KnowledgeItemUpdateRequestDto
    ): Promise<void> {
        const session = this.em.fork();
        await session.begin();

        try {
            // Verify knowledge base exists in workspace
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

            await this.knowledgeItemService.update(item.id, dto, {
                em: session,
                actionBy: user.id,
            });

            await this.activityService.createByUser(
                user,
                {
                    action: ENUM_ACTIVITY_ACTION.UPDATE,
                    subject: ENUM_POLICY_SUBJECT.KNOWLEDGE_BASE,
                    metadata: {
                        knowledgeBaseId,
                        itemId: item.id,
                        itemType: item.type,
                        itemTitle: item.title,
                    },
                },
                { em: session }
            );

            await session.commit();
        } catch (err: unknown) {
            await session.rollback();

            if (err instanceof NotFoundException) {
                throw err;
            }

            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    @KnowledgeItemWorkspaceBatchDeleteDoc()
    @Response('knowledgeItem.batchDelete')
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.WORKSPACE_OWNER)
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.KNOWLEDGE_BASE,
        action: [ENUM_POLICY_ACTION.DELETE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/batch/delete')
    async batchDelete(
        @AuthJwtPayload<IAuthJwtAccessTokenPayload>('user', UserActiveParsePipe)
        user: UserEntity,
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('knowledgeBaseId') knowledgeBaseId: string,
        @Body() { ids }: BatchIdsRequestDto
    ): Promise<IResponse<BatchResultResponseDto>> {
        await this.findKnowledgeBaseOrFail(workspace, knowledgeBaseId);

        const data = await runBatch(ids, async id => {
            const item = await this.findItemOrFail(knowledgeBaseId, id);
            const session = this.em.fork();
            await session.begin();

            try {
                await this.knowledgeItemService.softDelete(item.id, {
                    em: session,
                    actionBy: user.id,
                });
                await this.activityService.createByUser(
                    user,
                    {
                        action: ENUM_ACTIVITY_ACTION.DELETE,
                        subject: ENUM_POLICY_SUBJECT.KNOWLEDGE_BASE,
                        metadata: {
                            knowledgeBaseId,
                            itemId: item.id,
                            itemType: item.type,
                            itemTitle: item.title,
                        },
                    },
                    { em: session }
                );
                await session.commit();
            } catch (err: unknown) {
                await session.rollback();
                throw err;
            }
        });

        return { data };
    }

    @KnowledgeItemWorkspaceBatchProcessDoc()
    @Response('knowledgeItem.batchProcess')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.KNOWLEDGE_BASE,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/batch/process')
    async batchProcess(
        @AuthJwtPayload<IAuthJwtAccessTokenPayload>('user', UserActiveParsePipe)
        user: UserEntity,
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('knowledgeBaseId') knowledgeBaseId: string,
        @Body() { ids }: BatchIdsRequestDto
    ): Promise<IResponse<BatchResultResponseDto>> {
        await this.findKnowledgeBaseOrFail(workspace, knowledgeBaseId);

        const queued: string[] = [];

        const data = await runBatch(ids, async id => {
            const item = await this.findItemOrFail(knowledgeBaseId, id);

            // Everything except an in-flight item can be (re)processed.
            if (item.status === ENUM_KNOWLEDGE_BASE_ITEM_STATUS.PROCESSING) {
                throw new ConflictException({
                    statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                    message: 'knowledgeItem.error.processing',
                });
            }

            // Set the status without going through `update`, which would
            // enqueue one ingest task per item; the batch is queued once below.
            await this.knowledgeItemService.updateStatus(item.id, {
                status: ENUM_KNOWLEDGE_BASE_ITEM_STATUS.READY,
                errorMessage: null,
            });

            await this.activityService.createByUser(user, {
                action: ENUM_ACTIVITY_ACTION.UPDATE,
                subject: ENUM_POLICY_SUBJECT.KNOWLEDGE_BASE,
                metadata: {
                    knowledgeBaseId,
                    itemId: item.id,
                    itemType: item.type,
                    itemTitle: item.title,
                },
            });

            queued.push(item.id);
        });

        await this.knowledgeIngestService.enqueueMany(queued);

        return { data };
    }

    @KnowledgeItemWorkspaceDeleteDoc()
    @Response('knowledgeItem.delete')
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.WORKSPACE_OWNER)
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.KNOWLEDGE_BASE,
        action: [ENUM_POLICY_ACTION.DELETE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/:id/delete')
    async delete(
        @AuthJwtPayload<IAuthJwtAccessTokenPayload>('user', UserActiveParsePipe)
        user: UserEntity,
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('knowledgeBaseId') knowledgeBaseId: string,
        @Param('id') id: string
    ): Promise<void> {
        const session = this.em.fork();
        await session.begin();

        try {
            // Verify knowledge base exists in workspace
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

            const item = await this.knowledgeItemService.findOne({
                knowledgeBase: knowledgeBaseId,
                id,
                deletedAt: null,
            });

            if (!item) {
                throw new NotFoundException({
                    statusCode: ENUM_APP_STATUS_CODE_ERROR.NOT_FOUND,
                    message: 'knowledgeItem.error.notFound',
                });
            }

            await this.knowledgeItemService.softDelete(item.id, {
                em: session,
                actionBy: user.id,
            });

            await this.activityService.createByUser(
                user,
                {
                    action: ENUM_ACTIVITY_ACTION.DELETE,
                    subject: ENUM_POLICY_SUBJECT.KNOWLEDGE_BASE,
                    metadata: {
                        knowledgeBaseId,
                        itemId: item.id,
                        itemType: item.type,
                        itemTitle: item.title,
                    },
                },
                { em: session }
            );

            await session.commit();
        } catch (err: unknown) {
            await session.rollback();

            if (err instanceof NotFoundException) {
                throw err;
            }

            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    // Shared by the batch endpoints: same lookups + 404s the single-item
    // endpoints do, so a bad id becomes one `failed` entry instead of
    // aborting the whole batch.
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

    private async findItemOrFail(
        knowledgeBaseId: string,
        id: string
    ): Promise<KnowledgeItemEntity> {
        const item = await this.knowledgeItemService.findOne({
            knowledgeBase: knowledgeBaseId,
            id,
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
}
