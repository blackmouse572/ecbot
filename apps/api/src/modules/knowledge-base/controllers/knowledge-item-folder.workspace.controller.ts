import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Param,
    Body,
    HttpCode,
    HttpStatus,
    NotFoundException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from '@app/common/response/decorators/response.decorator';
import {
    IResponse,
    IResponsePaging,
} from 'src/common/response/interfaces/response.interface';
import { BadRequestException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { KnowledgeItemFolderService } from '../services/knowledge-item-folder.service';
import { ApiKeyProtected } from '@app/modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@app/modules/auth/decorators/auth.jwt.decorator';
import { IAuthJwtAccessTokenPayload } from '@app/modules/auth/interfaces/auth.interface';
import {
    ENUM_POLICY_SUBJECT,
    ENUM_POLICY_ACTION,
} from '@app/modules/policy/enums/policy.enum';
import { UserProtected } from '@app/modules/user/decorators/user.decorator';
import { UserActiveParsePipe } from '@app/modules/user/pipes/user.parse.pipe';
import { UserEntity } from '@app/modules/user/repository/entities/user.entity';
import { WorkspacePayload } from '@app/modules/workspace/decorators/workspace.decorator';
import { WorkspacePolicyAbilityProtected } from '@app/modules/workspace/decorators/workspace.policy.decorator';
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import {
    KnowledgeItemFolderWorkspaceListDoc,
    KnowledgeItemFolderWorkspaceGetDoc,
    KnowledgeItemFolderWorkspaceCreateDoc,
    KnowledgeItemFolderWorkspaceUpdateDoc,
    KnowledgeItemFolderWorkspaceDeleteDoc,
} from '../docs/knowledge-item-folder.workspace.doc';
import { KnowledgeItemFolderResponseDto } from '../dtos/response/knowledge-item-folder.response.dto';
import { PaginationQuery } from '@app/common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from '@app/common/pagination/dtos/pagination.list.dto';
import { PaginationService } from '../../../common/pagination/services/pagination.service';
import { ENUM_APP_STATUS_CODE_ERROR } from '@app/app/enums/app.status-code.enum';
import { KnowledgeItemService } from '../services/knowledge-item.service';
import { ActivityService } from 'src/modules/activity/services/activity.service';
import { ENUM_ACTIVITY_ACTION } from '@app/modules/activity/enums/activity.enum';

@ApiTags('modules.workspace.knowledge-base.folder')
@Controller({
    version: '1',
    path: '/:workspace/knowledge-bases/:knowledgeBaseId/folders',
})
export class KnowledgeItemFolderController {
    constructor(
        private readonly em: EntityManager,
        private readonly folderService: KnowledgeItemFolderService,
        private readonly knowlegeBaseService: KnowledgeItemService,
        private readonly paginationService: PaginationService,
        private readonly activityService: ActivityService
    ) {}

    @KnowledgeItemFolderWorkspaceListDoc()
    @Response('knowledge-base.folder.list')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.KNOWLEDGE_BASE,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @Param('knowledgeBaseId') knowledgeBaseId: string,
        @WorkspacePayload() workspace: WorkspaceEntity,
        @PaginationQuery({
            availableSearch: ['name'],
        })
        { _search, _limit, _offset, _order }: PaginationListDto
    ): Promise<IResponsePaging<KnowledgeItemFolderResponseDto>> {
        const find: Record<string, any> = {
            ..._search,
            workspace: workspace.id,
            knowledgeBase: knowledgeBaseId,
        };

        const [data, total] = await Promise.all([
            this.folderService.find(find, {
                limit: _limit,
                offset: _offset,
                order: _order,
            }),
            this.folderService.getTotal({
                ...find,
                workspace: workspace.id,
                deletedAt: null,
            }),
        ]);
        const totalPage: number = this.paginationService.totalPage(
            total,
            _limit
        );

        return {
            _pagination: { total, totalPage },
            data: this.folderService.mapList(data),
        };
    }

    @KnowledgeItemFolderWorkspaceGetDoc()
    @Response('knowledge-base.folder.get')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.KNOWLEDGE_BASE,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/:folderId')
    async get(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('knowledgeBaseId') knowledgeBaseId: string,
        @Param('folderId') folderId: string
    ): Promise<IResponse<KnowledgeItemFolderResponseDto>> {
        const folder = await this.folderService.findOne({
            id: folderId,
            workspace: workspace.id,
            knowledgeBase: knowledgeBaseId,
        });
        if (!folder || folder.knowledgeBase.id !== knowledgeBaseId) {
            throw new NotFoundException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'knowledgeBase.error.notFound',
            });
        }
        return {
            data: this.folderService.mapGet(folder),
        };
    }

    @KnowledgeItemFolderWorkspaceCreateDoc()
    @Response('knowledge-base.folder.create')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.KNOWLEDGE_BASE,
        action: [ENUM_POLICY_ACTION.CREATE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/create')
    async create(
        @AuthJwtPayload<IAuthJwtAccessTokenPayload>('user', UserActiveParsePipe)
        user: UserEntity,
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('knowledgeBaseId') knowledgeBaseId: string,
        @Body()
        body: {
            name: string;
            parentId?: string;
        }
    ): Promise<IResponse<KnowledgeItemFolderResponseDto>> {
        const knowledgeBase = await this.knowlegeBaseService.findOne({
            id: knowledgeBaseId,
            workspace: workspace.id,
        });
        if (!knowledgeBase) {
            throw new NotFoundException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'knowledgeBase.error.notFound',
            });
        }

        const session = this.em.fork();
        await session.begin();

        try {
            const folder = await this.folderService.create(
                {
                    knowledgeBase: knowledgeBase.id,
                    name: body.name,
                    parentFolder: body.parentId,
                },
                { em: session }
            );

            await this.activityService.createByUser(
                user,
                {
                    action: ENUM_ACTIVITY_ACTION.CREATE,
                    subject: ENUM_POLICY_SUBJECT.KNOWLEDGE_BASE,
                    metadata: {
                        knowledgeBaseId,
                        folderId: folder.id,
                        name: folder.name,
                    },
                },
                { em: session }
            );

            await session.commit();

            return {
                data: this.folderService.mapGet(folder),
            };
        } catch (err: unknown) {
            await session.rollback();
            throw err;
        }
    }

    @KnowledgeItemFolderWorkspaceUpdateDoc()
    @Response('knowledge-base.folder.update')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.KNOWLEDGE_BASE,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/:folderId')
    async update(
        @AuthJwtPayload<IAuthJwtAccessTokenPayload>('user', UserActiveParsePipe)
        user: UserEntity,
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('knowledgeBaseId') knowledgeBaseId: string,
        @Param('folderId') folderId: string,
        @Body()
        body: {
            name?: string;
            parentId?: string;
        }
    ): Promise<IResponse<KnowledgeItemFolderResponseDto>> {
        const knowledgeBase = await this.knowlegeBaseService.findOne({
            id: knowledgeBaseId,
            workspace: workspace.id,
        });
        if (!knowledgeBase) {
            throw new NotFoundException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'knowledgeBase.error.notFound',
            });
        }
        if (body.parentId) {
            const parentFolder = await this.folderService.findOne({
                id: body.parentId,
                workspace: workspace.id,
                knowledgeBase: knowledgeBaseId,
            });
            if (!parentFolder) {
                throw new NotFoundException({
                    statusCode: ENUM_APP_STATUS_CODE_ERROR.NOT_FOUND,
                    message: 'Parent folder not found',
                });
            }
        }

        const session = this.em.fork();
        await session.begin();

        try {
            const folder = await this.folderService
                .update(
                    folderId,
                    {
                        name: body.name,
                        parentFolder: body.parentId,
                    },
                    { em: session }
                )
                .catch(e => {
                    throw new BadRequestException({
                        statusCode: ENUM_APP_STATUS_CODE_ERROR.NOT_FOUND,
                        message: 'knowledgeBase.error.notFound',
                    });
                });

            await this.activityService.createByUser(
                user,
                {
                    action: ENUM_ACTIVITY_ACTION.UPDATE,
                    subject: ENUM_POLICY_SUBJECT.KNOWLEDGE_BASE,
                    metadata: {
                        knowledgeBaseId,
                        folderId: folder.id,
                        name: folder.name,
                    },
                },
                { em: session }
            );

            await session.commit();

            return {
                data: this.folderService.mapGet(folder),
            };
        } catch (err: unknown) {
            await session.rollback();
            throw err;
        }
    }

    @KnowledgeItemFolderWorkspaceDeleteDoc()
    @Response('knowledge-base.folder.delete')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.KNOWLEDGE_BASE,
        action: [ENUM_POLICY_ACTION.DELETE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.NO_CONTENT)
    @Delete('/:folderId')
    async delete(
        @AuthJwtPayload<IAuthJwtAccessTokenPayload>('user', UserActiveParsePipe)
        user: UserEntity,
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('knowledgeBaseId') knowledgeBaseId: string,
        @Param('folderId') folderId: string
    ): Promise<void> {
        const folder = await this.folderService.findOne({
            id: folderId,
            workspace: workspace.id,
            knowledgeBase: knowledgeBaseId,
        });
        if (!folder || folder.knowledgeBase.id !== knowledgeBaseId) {
            throw new NotFoundException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'knowledgeBase.error.notFound',
            });
        }

        const session = this.em.fork();
        await session.begin();

        try {
            await this.folderService.softDelete(folderId, {
                actionBy: user.id,
                em: session,
            });

            await this.activityService.createByUser(
                user,
                {
                    action: ENUM_ACTIVITY_ACTION.DELETE,
                    subject: ENUM_POLICY_SUBJECT.KNOWLEDGE_BASE,
                    metadata: {
                        knowledgeBaseId,
                        folderId: folder.id,
                        // Captured before delete - `folder` was fetched above.
                        name: folder.name,
                    },
                },
                { em: session }
            );

            await session.commit();
        } catch (err: unknown) {
            await session.rollback();
            throw err;
        }
    }
}
