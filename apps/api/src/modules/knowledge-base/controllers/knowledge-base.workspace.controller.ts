import { PaginationQuery } from '@app/common/pagination/decorators/pagination.decorator';
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
import { EntityManager } from '@mikro-orm/postgresql';
import {
    Body,
    Controller,
    Get,
    InternalServerErrorException,
    NotFoundException,
    Param,
    Post,
    Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ENUM_APP_STATUS_CODE_ERROR } from 'src/app/enums/app.status-code.enum';
import { DatabaseIdResponseDto } from 'src/common/database/dtos/response/database.id.response.dto';
import { MessageService } from 'src/common/message/services/message.service';
import { ActivityService } from 'src/modules/activity/services/activity.service';
import { ApiKeyProtected } from 'src/modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from 'src/modules/auth/decorators/auth.jwt.decorator';
import { IAuthJwtAccessTokenPayload } from 'src/modules/auth/interfaces/auth.interface';
import {
    ENUM_POLICY_ACTION,
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
    KnowledgeBaseWorkspaceCreateDoc,
    KnowledgeBaseWorkspaceGetDoc,
    KnowledgeBaseWorkspaceListDoc,
    KnowledgeBaseWorkspaceUpdateDoc,
} from '../docs/knowledge-base.workspace.doc';
import { KnowledgeBaseCreateRequestDto } from '../dtos/request/knowledge-base.create.request.dto';
import { KnowledgeBaseUpdateRequestDto } from '../dtos/request/knowledge-base.update.request.dto';
import { KnowledgeBaseResponseDto } from '../dtos/response/knowledge-base.response.dto';
import { KnowledgeBaseService } from '../services/knowledge-base.service';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from '../../../common/pagination/enums/pagination.enum';

@ApiTags('modules.workspace.knowledge-base')
@Controller({
    version: '1',
    path: ':workspace/knowledge-bases',
})
export class KnowledgeBaseWorkspaceController {
    constructor(
        private readonly em: EntityManager,
        private readonly knowledgeBaseService: KnowledgeBaseService,
        private readonly paginationService: PaginationService,
        private readonly activityService: ActivityService
    ) {}

    @KnowledgeBaseWorkspaceListDoc()
    @ResponsePaging('knowledgeBase.list')
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
        };

        const [data, total] = await Promise.all([
            this.knowledgeBaseService.find(find, {
                limit: _limit,
                offset: _offset,
                order: _order,
            }),
            this.knowledgeBaseService.getTotal({
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
            data: this.knowledgeBaseService.mapList(data),
        };
    }

    @KnowledgeBaseWorkspaceGetDoc()
    @Response('knowledgeBase.get')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.KNOWLEDGE_BASE,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/:id')
    async get(
        @AuthJwtPayload<IAuthJwtAccessTokenPayload>('user', UserActiveParsePipe)
        user: UserEntity,
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('id') id: string
    ): Promise<IResponse<KnowledgeBaseResponseDto>> {
        const knowledgeBase = await this.knowledgeBaseService.findOne({
            id,
            workspace: workspace.id,
        });

        if (!knowledgeBase) {
            throw new NotFoundException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'knowledgeBase.error.notFound',
            });
        }

        return {
            data: this.knowledgeBaseService.mapGet(knowledgeBase),
        };
    }

    @KnowledgeBaseWorkspaceCreateDoc()
    @Response('knowledgeBase.create')
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
        @Body() dto: KnowledgeBaseCreateRequestDto
    ): Promise<IResponse<DatabaseIdResponseDto>> {
        const session = this.em.fork();
        await session.begin();

        try {
            const knowledgeBase = await this.knowledgeBaseService.create(
                {
                    ...dto,
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
                        knowledgeBaseId: knowledgeBase.id,
                        knowledgeBaseName: knowledgeBase.name,
                    },
                },
                { em: session }
            );

            await session.commit();

            return {
                data: {
                    id: knowledgeBase.id,
                },
            };
        } catch (err: unknown) {
            await session.rollback();

            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    @KnowledgeBaseWorkspaceUpdateDoc()
    @Response('knowledgeBase.update')
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
        @Param('id') id: string,
        @Body() dto: KnowledgeBaseUpdateRequestDto
    ): Promise<void> {
        const session = this.em.fork();
        await session.begin();

        try {
            const knowledgeBase = await this.knowledgeBaseService.update(
                id,
                dto,
                {
                    em: session,
                    actionBy: user.id,
                }
            );

            await this.activityService.createByUser(
                user,
                {
                    action: ENUM_ACTIVITY_ACTION.UPDATE,
                    subject: ENUM_POLICY_SUBJECT.KNOWLEDGE_BASE,
                    metadata: {
                        knowledgeBaseId: knowledgeBase.id,
                        knowledgeBaseName: knowledgeBase.name,
                    },
                },
                { em: session }
            );

            await session.commit();
        } catch (err: unknown) {
            await session.rollback();

            if (err instanceof NotFoundException) {
                throw new NotFoundException({
                    statusCode: ENUM_APP_STATUS_CODE_ERROR.NOT_FOUND,
                    message: 'knowledgeBase.error.notFound',
                });
            }

            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }
}
