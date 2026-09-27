import { ENUM_ACTIVITY_ACTION } from '@app/modules/activity/enums/activity.enum';
import { ActivityService } from '@app/modules/activity/services/activity.service';
import { ApiKeyProtected } from '@app/modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@app/modules/auth/decorators/auth.jwt.decorator';
import { IAuthJwtAccessTokenPayload } from '@app/modules/auth/interfaces/auth.interface';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from '@app/modules/policy/enums/policy.enum';
import { UserProtected } from '@app/modules/user/decorators/user.decorator';
import { UserActiveParsePipe } from '@app/modules/user/pipes/user.parse.pipe';
import { UserEntity } from '@app/modules/user/repository/entities/user.entity';
import {
    WorkspacePayload,
    WorkspacePolicyAbilityProtected,
} from '@app/modules/workspace/decorators/workspace.decorator';
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import {
    Body,
    Controller,
    Delete,
    Get,
    InternalServerErrorException,
    Logger,
    NotFoundException,
    Param,
    Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EntityManager } from '@mikro-orm/postgresql';
import { plainToInstance } from 'class-transformer';
import { ENUM_APP_STATUS_CODE_ERROR } from 'src/app/enums/app.status-code.enum';
import { DatabaseIdResponseDto } from 'src/common/database/dtos/response/database.id.response.dto';
import { PaginationQuery } from 'src/common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from 'src/common/pagination/dtos/pagination.list.dto';
import { PaginationService } from 'src/common/pagination/services/pagination.service';
import {
    IResponse,
    IResponsePaging,
} from 'src/common/response/interfaces/response.interface';
import {
    Response,
    ResponsePaging,
} from 'src/common/response/decorators/response.decorator';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from 'src/common/pagination/enums/pagination.enum';
import { ChatbotService } from '@app/modules/chatbot/services/chatbot.service';
import { KnowledgeItemService } from '../services/knowledge-item.service';
import { ChatbotKnowledgeItemService } from '../services/chatbot-knowledge-item.service';
import { ChatbotKnowledgeItemResponseDto } from '../dtos/response/chatbot-knowledge-item.response.dto';
import {
    ChatbotKnowledgeItemListDoc,
    ChatbotKnowledgeItemLinkDoc,
    ChatbotKnowledgeItemUnlinkDoc,
} from '../docs/chatbot-knowledge-item.workspace.doc';
import { KnowledgeItemEntity } from '../repository/entities/knowledge-item.entity';

@ApiTags('modules.workspace.chatbot-knowledge-item')
@Controller({
    version: '1',
    path: ':workspace/chatbots/:chatbotId/knowledge-items',
})
export class ChatbotKnowledgeItemWorkspaceController {
    private readonly logger = new Logger(
        ChatbotKnowledgeItemWorkspaceController.name
    );

    constructor(
        private readonly em: EntityManager,
        private readonly chatbotService: ChatbotService,
        private readonly knowledgeItemService: KnowledgeItemService,
        private readonly chatbotKnowledgeItemService: ChatbotKnowledgeItemService,
        private readonly paginationService: PaginationService,
        private readonly activityService: ActivityService
    ) {}

    @ChatbotKnowledgeItemListDoc()
    @ResponsePaging('chatbotKnowledgeItem.list')
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
        @Param('chatbotId') chatbotId: string,
        @PaginationQuery({
            availableOrderBy: ['createdAt', 'priority'],
            defaultOrderBy: 'priority',
            defaultOrderDirection: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC,
        })
        { _limit, _offset, _order }: PaginationListDto
    ): Promise<IResponsePaging<ChatbotKnowledgeItemResponseDto>> {
        // Verify chatbot exists in workspace
        const chatbot = await this.chatbotService.findOne(
            { id: chatbotId, workspace: workspace.id },
            { populate: [] }
        );

        if (!chatbot) {
            throw new NotFoundException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'chatbot.error.notFound',
            });
        }

        const [data, total] = await Promise.all([
            this.chatbotKnowledgeItemService.findByChatbot(
                chatbotId,
                {},
                {
                    limit: _limit,
                    offset: _offset,
                    order: _order,
                }
            ),
            this.chatbotKnowledgeItemService.getTotalByChatbot(chatbotId),
        ]);

        const totalPage: number = this.paginationService.totalPage(
            total,
            _limit
        );

        return {
            data: this.chatbotKnowledgeItemService.mapList(data),
            _pagination: {
                total,
                totalPage,
            },
        };
    }

    @ChatbotKnowledgeItemLinkDoc()
    @Response('chatbotKnowledgeItem.link')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.KNOWLEDGE_BASE,
        action: [ENUM_POLICY_ACTION.CREATE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/:knowledgeItemId/link')
    async link(
        @AuthJwtPayload<IAuthJwtAccessTokenPayload>('user', UserActiveParsePipe)
        user: UserEntity,
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('chatbotId') chatbotId: string,
        @Param('knowledgeItemId') knowledgeItemId: string
    ): Promise<IResponse<DatabaseIdResponseDto>> {
        const session = this.em.fork();
        await session.begin();

        try {
            // Verify chatbot exists in workspace
            const chatbot = await this.chatbotService.findOne(
                { id: chatbotId, workspace: workspace.id },
                { populate: [] }
            );

            if (!chatbot) {
                throw new NotFoundException({
                    statusCode: ENUM_APP_STATUS_CODE_ERROR.NOT_FOUND,
                    message: 'chatbot.error.notFound',
                });
            }

            // Verify knowledge item exists and its knowledge base belongs to
            // this workspace — a cross-workspace id must 404 like a
            // nonexistent one, not link the item into a foreign chatbot.
            const knowledgeItem = await session
                .getRepository(KnowledgeItemEntity)
                .findOne(
                    { id: knowledgeItemId, deletedAt: null },
                    { populate: ['knowledgeBase'] }
                );

            if (
                !knowledgeItem ||
                knowledgeItem.knowledgeBase.workspace.id !== workspace.id
            ) {
                throw new NotFoundException({
                    statusCode: ENUM_APP_STATUS_CODE_ERROR.NOT_FOUND,
                    message: 'knowledgeItem.error.notFound',
                });
            }

            // Link the item
            const link = await this.chatbotKnowledgeItemService.linkItem(
                chatbotId,
                knowledgeItemId,
                { em: session, actionBy: user.id }
            );

            await this.activityService.createByUser(
                user,
                {
                    action: ENUM_ACTIVITY_ACTION.CREATE,
                    subject: ENUM_POLICY_SUBJECT.KNOWLEDGE_BASE,
                    metadata: {
                        chatbotId,
                        knowledgeItemId,
                    },
                },
                { em: session }
            );

            await session.commit();

            return {
                data: plainToInstance(DatabaseIdResponseDto, { id: link.id }),
            };
        } catch (err: unknown) {
            await session.rollback();

            if (err instanceof NotFoundException) {
                this.logger.error(
                    `Link knowledge item to chatbot failed: chatbot ${chatbotId} or item ${knowledgeItemId} not found`
                );
                throw err;
            }

            this.logger.error(
                `Link knowledge item to chatbot failed: ${err instanceof Error ? err.stack : JSON.stringify(err)}`
            );
            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    @ChatbotKnowledgeItemUnlinkDoc()
    @Response('chatbotKnowledgeItem.unlink')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.KNOWLEDGE_BASE,
        action: [ENUM_POLICY_ACTION.DELETE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/:knowledgeItemId/unlink')
    async unlink(
        @AuthJwtPayload<IAuthJwtAccessTokenPayload>('user', UserActiveParsePipe)
        user: UserEntity,
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('chatbotId') chatbotId: string,
        @Param('knowledgeItemId') knowledgeItemId: string
    ): Promise<void> {
        const session = this.em.fork();
        await session.begin();

        try {
            // Verify chatbot exists in workspace
            const chatbot = await this.chatbotService.findOne(
                { id: chatbotId, workspace: workspace.id },
                { populate: [] }
            );

            if (!chatbot) {
                throw new NotFoundException({
                    statusCode: ENUM_APP_STATUS_CODE_ERROR.NOT_FOUND,
                    message: 'chatbot.error.notFound',
                });
            }

            // Fetched before unlink so the activity can carry a display name.
            const item = await this.knowledgeItemService.findOne({
                id: knowledgeItemId,
            });

            // Unlink the item
            await this.chatbotKnowledgeItemService.unlinkItem(
                chatbotId,
                knowledgeItemId,
                { em: session, actionBy: user.id }
            );

            await this.activityService.createByUser(
                user,
                {
                    action: ENUM_ACTIVITY_ACTION.DELETE,
                    subject: ENUM_POLICY_SUBJECT.KNOWLEDGE_BASE,
                    metadata: {
                        chatbotId,
                        knowledgeItemId,
                        name: item?.title,
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

            this.logger.error(
                `Unlink knowledge item from chatbot failed: ${err instanceof Error ? err.stack : JSON.stringify(err)}`
            );
            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }
}
