import { EntityManager } from '@mikro-orm/postgresql';
import {
    ConflictException,
    Controller,
    Delete,
    Get,
    NotFoundException,
    Param,
    ParseUUIDPipe,
    Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ENUM_APP_STATUS_CODE_ERROR } from 'src/app/enums/app.status-code.enum';
import {
    PaginationQuery,
    PaginationQueryFilterEqual,
    PaginationQueryFilterInEnum,
} from 'src/common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from 'src/common/pagination/dtos/pagination.list.dto';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from 'src/common/pagination/enums/pagination.enum';
import { PaginationService } from 'src/common/pagination/services/pagination.service';
import {
    Response,
    ResponsePaging,
} from 'src/common/response/decorators/response.decorator';
import {
    IResponse,
    IResponsePaging,
} from 'src/common/response/interfaces/response.interface';
import { ENUM_ACTIVITY_ACTION } from 'src/modules/activity/enums/activity.enum';
import { ActivityService } from 'src/modules/activity/services/activity.service';
import { ApiKeyProtected } from 'src/modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from 'src/modules/auth/decorators/auth.jwt.decorator';
import { IAuthJwtAccessTokenPayload } from 'src/modules/auth/interfaces/auth.interface';
import {
    PolicyAbilityProtected,
    PolicyRoleProtected,
} from 'src/modules/policy/decorators/policy.decorator';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from 'src/modules/policy/enums/policy.enum';
import { UserProtected } from 'src/modules/user/decorators/user.decorator';
import { KNOWLEDGE_ITEM_ADMIN_AVAILABLE_SEARCH } from '../constants/knowledge-item.list.constant';
import {
    KnowledgeItemAdminDeleteDoc,
    KnowledgeItemAdminGetDoc,
    KnowledgeItemAdminListDoc,
    KnowledgeItemAdminReprocessDoc,
} from '../docs/knowledge-item.admin.doc';
import { KnowledgeItemAdminGetResponseDto } from '../dtos/response/knowledge-item.admin-get.response.dto';
import { KnowledgeItemAdminListResponseDto } from '../dtos/response/knowledge-item.admin-list.response.dto';
import { ENUM_KNOWLEDGE_BASE_ITEM_STATUS } from '../enums/knowledge-base-item-status.enum';
import { ENUM_KNOWLEDGE_BASE_ITEM_TYPE } from '../enums/knowledge-base-item-type.enum';
import { KnowledgeItemEntity } from '../repository/entities/knowledge-item.entity';
import { KnowledgeIngestService } from '../services/knowledge-ingest.service';
import { KnowledgeItemAdminService } from '../services/knowledge-item.admin.service';
import { KnowledgeItemService } from '../services/knowledge-item.service';

/** Admins see, delete and reprocess knowledge items; they never edit content. */
@ApiTags('modules.admin.knowledge-item')
@Controller({
    version: '1',
    path: '/knowledge-item',
})
export class KnowledgeItemAdminController {
    constructor(
        private readonly knowledgeItemAdminService: KnowledgeItemAdminService,
        private readonly knowledgeItemService: KnowledgeItemService,
        private readonly knowledgeIngestService: KnowledgeIngestService,
        private readonly paginationService: PaginationService,
        private readonly activityService: ActivityService,
        private readonly em: EntityManager
    ) {}

    @KnowledgeItemAdminListDoc()
    @ResponsePaging('knowledgeItem.list')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.KNOWLEDGE_BASE,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @PaginationQuery({
            availableSearch: KNOWLEDGE_ITEM_ADMIN_AVAILABLE_SEARCH,
            availableOrderBy: ['createdAt', 'updatedAt', 'status', 'type'],
            defaultOrderBy: 'createdAt',
            defaultOrderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC,
        })
        { _search, _limit, _offset, _order }: PaginationListDto,
        @PaginationQueryFilterEqual('knowledgeBase.workspace', {
            queryField: 'workspace',
        })
        _workspace?: Record<string, any>,
        @PaginationQueryFilterEqual('chatbot') _chatbot?: Record<string, any>,
        @PaginationQueryFilterInEnum(
            'type',
            undefined,
            ENUM_KNOWLEDGE_BASE_ITEM_TYPE
        )
        _type?: Record<string, any>,
        @PaginationQueryFilterInEnum(
            'status',
            undefined,
            ENUM_KNOWLEDGE_BASE_ITEM_STATUS
        )
        _status?: Record<string, any>
    ): Promise<IResponsePaging<KnowledgeItemAdminListResponseDto>> {
        const find: Record<string, any> = {
            ..._search,
            ..._workspace,
            ..._chatbot,
            ..._type,
            ..._status,
        };
        const [data, total] = await Promise.all([
            this.knowledgeItemAdminService.findAll(find, {
                limit: _limit,
                offset: _offset,
                order: _order,
            }),
            this.knowledgeItemAdminService.getTotal(find),
        ]);
        const totalPage = this.paginationService.totalPage(total, _limit);
        return { _pagination: { total, totalPage }, data };
    }

    @KnowledgeItemAdminGetDoc()
    @Response('knowledgeItem.get')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.KNOWLEDGE_BASE,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/get/:item')
    async get(
        @Param('item', ParseUUIDPipe) id: string
    ): Promise<IResponse<KnowledgeItemAdminGetResponseDto>> {
        const item = await this.knowledgeItemAdminService.findOneById(id);
        if (!item) this.throwNotFound();
        return { data: item };
    }

    /** Same soft delete as the workspace route: chunks and RAG docs follow. */
    @KnowledgeItemAdminDeleteDoc()
    @Response('knowledgeItem.delete')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.KNOWLEDGE_BASE,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.DELETE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/delete/:item')
    async delete(
        @Param('item', ParseUUIDPipe) id: string,
        @AuthJwtPayload<IAuthJwtAccessTokenPayload>()
        { user: adminId }: IAuthJwtAccessTokenPayload
    ): Promise<IResponse<void>> {
        const item = await this.findItemOrFail(id);
        const workspace = item.knowledgeBase.workspace;

        await this.em.transactional(async em => {
            await this.knowledgeItemService.softDelete(item.id, {
                em,
                actionBy: adminId,
            });
            await this.activityService.createByAdminWithWorkspace(
                workspace.owner,
                adminId,
                workspace,
                {
                    action: ENUM_ACTIVITY_ACTION.DELETE,
                    subject: ENUM_POLICY_SUBJECT.KNOWLEDGE_BASE,
                    metadata: { id: item.id, name: item.title },
                },
                { em }
            );
        });
        return {};
    }

    /** Same as the workspace batch process, for one item. */
    @KnowledgeItemAdminReprocessDoc()
    @Response('knowledgeItem.reprocess')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.KNOWLEDGE_BASE,
        action: [ENUM_POLICY_ACTION.READ, ENUM_POLICY_ACTION.UPDATE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/reprocess/:item')
    async reprocess(
        @Param('item', ParseUUIDPipe) id: string,
        @AuthJwtPayload<IAuthJwtAccessTokenPayload>()
        { user: adminId }: IAuthJwtAccessTokenPayload
    ): Promise<IResponse<void>> {
        const item = await this.findItemOrFail(id);
        if (item.status === ENUM_KNOWLEDGE_BASE_ITEM_STATUS.PROCESSING) {
            throw new ConflictException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'knowledgeItem.error.processing',
            });
        }
        const workspace = item.knowledgeBase.workspace;

        await this.knowledgeItemService.updateStatus(item.id, {
            status: ENUM_KNOWLEDGE_BASE_ITEM_STATUS.READY,
            errorMessage: null,
        });
        await this.activityService.createByAdminWithWorkspace(
            workspace.owner,
            adminId,
            workspace,
            {
                action: ENUM_ACTIVITY_ACTION.UPDATE,
                subject: ENUM_POLICY_SUBJECT.KNOWLEDGE_BASE,
                metadata: { id: item.id, name: item.title },
            }
        );
        await this.knowledgeIngestService.enqueue(item.id);
        return {};
    }

    private async findItemOrFail(id: string): Promise<KnowledgeItemEntity> {
        const item = await this.knowledgeItemAdminService.findEntityById(id);
        if (!item) this.throwNotFound();
        return item;
    }

    private throwNotFound(): never {
        throw new NotFoundException({
            statusCode: ENUM_APP_STATUS_CODE_ERROR.NOT_FOUND,
            message: 'knowledgeItem.error.notFound',
        });
    }
}
