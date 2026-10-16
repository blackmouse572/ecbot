import { runBatch } from '@app/common/batch/utils/run-batch.util';
import { ENUM_ACTIVITY_ACTION } from '@app/modules/activity/enums/activity.enum';
import { ActivityService } from '@app/modules/activity/services/activity.service';
import { ChatbotService } from '@app/modules/chatbot/services/chatbot.service';
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
import { EntityManager } from '@mikro-orm/postgresql';
import {
    Body,
    ConflictException,
    Controller,
    Delete,
    Get,
    NotFoundException,
    Param,
    Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { ENUM_APP_STATUS_CODE_ERROR } from 'src/app/enums/app.status-code.enum';
import { DatabaseIdResponseDto } from 'src/common/database/dtos/response/database.id.response.dto';
import { PaginationQuery } from 'src/common/pagination/decorators/pagination.decorator';
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
import {
    ChatbotKnowledgeItemClientLinkDoc,
    ChatbotKnowledgeItemClientListDoc,
    ChatbotKnowledgeItemClientUnlinkDoc,
} from '../docs/chatbot-knowledge-item.client.doc';
import { ChatbotKnowledgeItemBatchLinkRequestDto } from '../dtos/request/chatbot-knowledge-item.batch-link.request.dto';
import { ChatbotKnowledgeItemResponseDto } from '../dtos/response/chatbot-knowledge-item.response.dto';
import { KnowledgeItemBatchResultResponseDto } from '../dtos/response/knowledge-item.batch-result.response.dto';
import { KnowledgeItemEntity } from '../repository/entities/knowledge-item.entity';
import { ChatbotKnowledgeItemService } from '../services/chatbot-knowledge-item.service';
import { KnowledgeItemService } from '../services/knowledge-item.service';

// 3rd-party surface for which knowledge a chatbot answers from. Mirrors
// ChatbotKnowledgeItemWorkspaceController; writes act as the credential's
// creator, in the records and the activity log. See ADR-0012.
@ApiTags('modules.client.chatbotKnowledgeItem')
@Controller('/chatbots/:chatbotId/knowledge-items')
export class ChatbotKnowledgeItemClientController {
    constructor(
        private readonly em: EntityManager,
        private readonly chatbotService: ChatbotService,
        private readonly knowledgeItemService: KnowledgeItemService,
        private readonly chatbotKnowledgeItemService: ChatbotKnowledgeItemService,
        private readonly paginationService: PaginationService,
        private readonly activityService: ActivityService
    ) {}

    @ChatbotKnowledgeItemClientListDoc()
    @ResponsePaging('knowledgeItem.list')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.KNOWLEDGE_BASE,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @Get('/')
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
        await this.findChatbotOrFail(workspace, chatbotId);

        const [data, total] = await Promise.all([
            this.chatbotKnowledgeItemService.findByChatbot(
                chatbotId,
                {},
                { limit: _limit, offset: _offset, order: _order }
            ),
            this.chatbotKnowledgeItemService.getTotalByChatbot(chatbotId),
        ]);

        return {
            data: this.chatbotKnowledgeItemService.mapList(data),
            _pagination: {
                total,
                totalPage: this.paginationService.totalPage(total, _limit),
            },
        };
    }

    @ChatbotKnowledgeItemClientLinkDoc()
    @Response('knowledgeItem.batchLink')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.KNOWLEDGE_BASE,
        action: [ENUM_POLICY_ACTION.CREATE],
    })
    @Post('/link')
    async link(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @ClientCredentialPayload() credential: ClientCredentialEntity,
        @Param('chatbotId') chatbotId: string,
        @Body() body: ChatbotKnowledgeItemBatchLinkRequestDto
    ): Promise<IResponse<KnowledgeItemBatchResultResponseDto>> {
        await this.findChatbotOrFail(workspace, chatbotId);
        const { ids, truncated } =
            await this.knowledgeItemService.resolveBatchTarget(
                workspace.id,
                body
            );
        const actor = credential.createdBy;

        const result = await runBatch(ids, async knowledgeItemId => {
            const session = this.em.fork();
            await session.begin();
            try {
                const knowledgeItem = await session
                    .getRepository(KnowledgeItemEntity)
                    .findOne(
                        { id: knowledgeItemId, deletedAt: null },
                        { populate: ['knowledgeBase'] }
                    );
                // A cross-workspace id must 404 like a nonexistent one.
                if (
                    !knowledgeItem ||
                    knowledgeItem.knowledgeBase.workspace.id !== workspace.id
                ) {
                    throw new NotFoundException({
                        statusCode: ENUM_APP_STATUS_CODE_ERROR.NOT_FOUND,
                        message: 'knowledgeItem.error.notFound',
                    });
                }
                try {
                    await this.chatbotKnowledgeItemService.linkItem(
                        chatbotId,
                        knowledgeItemId,
                        { em: session, actionBy: actor.id }
                    );
                } catch (err: unknown) {
                    // Already linked counts as linked.
                    if (err instanceof ConflictException) {
                        await session.rollback();
                        return;
                    }
                    throw err;
                }
                await this.activityService.createByUserWithWorkspace(
                    actor,
                    workspace,
                    {
                        action: ENUM_ACTIVITY_ACTION.CREATE,
                        subject: ENUM_POLICY_SUBJECT.KNOWLEDGE_BASE,
                        metadata: { chatbotId, knowledgeItemId },
                    },
                    { em: session }
                );
                await session.commit();
            } catch (err: unknown) {
                await session.rollback();
                throw err;
            }
            // After the commit, so a rolled-back link never reaches the vector store.
            await this.chatbotKnowledgeItemService.syncChatbotLinks(
                knowledgeItemId
            );
        });

        return { data: { ...result, truncated } };
    }

    @ChatbotKnowledgeItemClientUnlinkDoc()
    @Response('knowledgeItem.unlink')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.KNOWLEDGE_BASE,
        action: [ENUM_POLICY_ACTION.DELETE],
    })
    @Delete('/:knowledgeItemId')
    async unlink(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @ClientCredentialPayload() credential: ClientCredentialEntity,
        @Param('chatbotId') chatbotId: string,
        @Param('knowledgeItemId') knowledgeItemId: string
    ): Promise<IResponse<DatabaseIdResponseDto>> {
        await this.findChatbotOrFail(workspace, chatbotId);
        const item = await this.knowledgeItemService.findOne({
            id: knowledgeItemId,
        });

        const session = this.em.fork();
        await session.begin();
        try {
            await this.chatbotKnowledgeItemService.unlinkItem(
                chatbotId,
                knowledgeItemId,
                { em: session, actionBy: credential.createdBy.id }
            );
            await this.activityService.createByUserWithWorkspace(
                credential.createdBy,
                workspace,
                {
                    action: ENUM_ACTIVITY_ACTION.DELETE,
                    subject: ENUM_POLICY_SUBJECT.KNOWLEDGE_BASE,
                    metadata: { chatbotId, knowledgeItemId, name: item?.title },
                },
                { em: session }
            );
            await session.commit();
        } catch (err: unknown) {
            await session.rollback();
            throw err;
        }
        await this.chatbotKnowledgeItemService.syncChatbotLinks(
            knowledgeItemId
        );

        return {
            data: plainToInstance(DatabaseIdResponseDto, {
                id: knowledgeItemId,
            }),
        };
    }

    private async findChatbotOrFail(
        workspace: WorkspaceEntity,
        chatbotId: string
    ): Promise<void> {
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
    }
}
