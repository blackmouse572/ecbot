import {
    IResponse,
    IResponsePaging,
} from '@app/common/response/interfaces/response.interface';
import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import { ENUM_ACTIVITY_ACTION } from '@app/modules/activity/enums/activity.enum';
import { ActivityService } from '@app/modules/activity/services/activity.service';
import { ApiKeyProtected } from '@app/modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@app/modules/auth/decorators/auth.jwt.decorator';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from '@app/modules/policy/enums/policy.enum';
import { UserProtected } from '@app/modules/user/decorators/user.decorator';
import { UserParsePipe } from '@app/modules/user/pipes/user.parse.pipe';
import { UserEntity } from '@app/modules/user/repository/entities/user.entity';
import {
    WorkspacePayload,
    WorkspaceScopedProtected,
} from '@app/modules/workspace/decorators/workspace.decorator';
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import {
    Body,
    Controller,
    Get,
    NotFoundException,
    Param,
    Patch,
    Post,
    Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
    PaginationQuery,
    PaginationQueryFilterEqual,
    PaginationQueryFilterInBoolean,
    PaginationQueryFilterInEnum,
} from 'src/common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from 'src/common/pagination/dtos/pagination.list.dto';
import { PaginationService } from 'src/common/pagination/services/pagination.service';
import {
    Response,
    ResponsePaging,
} from 'src/common/response/decorators/response.decorator';
import { ConversationReactToMessageRequestDto } from '../dtos/request/conversation.react-to-message.request.dto';
import { ConversationSendMessageRequestDto } from '../dtos/request/conversation.send-message.request.dto';
import { ConversationUpdateBotRequestDto } from '../dtos/request/conversation.update-bot.request.dto';
import { ConversationUpdateStatusRequestDto } from '../dtos/request/conversation.update-status.request.dto';
import { ConversationGetResponseDto } from '../dtos/response/conversation.get.response.dto';
import { MessageGetResponseDto } from '../dtos/response/message.get.response.dto';
import { ENUM_CONVERSATION_STATUS } from '../enums/conversation.enum';
import { ConversationMessagingService } from '../services/conversation-messaging.service';
import { ConversationService } from '../services/conversation.service';
import {
    ConversationWorkspaceGetDoc,
    ConversationWorkspaceListDoc,
    ConversationWorkspaceListMessagesDoc,
    ConversationWorkspaceMarkReadDoc,
    ConversationWorkspaceReactToMessageDoc,
    ConversationWorkspaceSendMessageDoc,
    ConversationWorkspaceUpdateBotDoc,
    ConversationWorkspaceUpdateStatusDoc,
} from '../docs/conversation.workspace.doc';
import {
    CONVERSATION_DEFAULT_AVAILABLE_SEARCH,
    CONVERSATION_DEFAULT_STATUS,
    CONVERSATION_DEFAULT_ACCOUNT_TYPE,
} from '../constants/conversation.list.constant';

@ApiTags('modules.workspace.conversation')
@Controller({
    version: '1',
    path: '/:workspace/conversations',
})
export class ConversationWorkspaceController {
    constructor(
        private readonly conversationService: ConversationService,
        private readonly paginationService: PaginationService,
        private readonly conversationMessagingService: ConversationMessagingService,
        private readonly activityService: ActivityService
    ) {}

    @ConversationWorkspaceListDoc()
    @ResponsePaging('conversation.workspace.list')
    @WorkspaceScopedProtected({
        subject: ENUM_POLICY_SUBJECT.CHATBOT,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/')
    async list(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @AuthJwtPayload('user') operatorId: string,
        @PaginationQuery({
            availableSearch: CONVERSATION_DEFAULT_AVAILABLE_SEARCH,
        })
        { _search, _limit, _offset, _order }: PaginationListDto,
        @PaginationQueryFilterInEnum(
            'status',
            CONVERSATION_DEFAULT_STATUS,
            ENUM_CONVERSATION_STATUS
        )
        status: Record<string, any>,
        @PaginationQueryFilterInEnum(
            'account.type',
            CONVERSATION_DEFAULT_ACCOUNT_TYPE,
            ENUM_ACCOUNT_TYPE,
            { queryField: 'accountType' }
        )
        accountType: Record<string, any>,
        @PaginationQueryFilterEqual('account.id', { queryField: 'account' })
        account: Record<string, any>,
        @PaginationQueryFilterEqual('chatbot.id', { queryField: 'chatbot' })
        chatbot: Record<string, any>,
        @PaginationQueryFilterInBoolean('botEnabled', [true, false], {
            queryField: 'botEnabled',
        })
        botEnabled: Record<string, any>
    ): Promise<IResponsePaging<ConversationGetResponseDto>> {
        const find: Record<string, any> = {
            ..._search,
            ...status,
            ...accountType,
            ...account,
            ...chatbot,
            ...botEnabled,
        };

        const [conversations, total] = await Promise.all([
            this.conversationService.findByWorkspace(workspace.id, find, {
                paging: { limit: _limit, offset: _offset },
                order: _order,
            }),
            this.conversationService.countByWorkspace(workspace.id, find),
        ]);

        const conversationIds = conversations.map(c => c.id);
        const unreadCounts = await this.conversationService.getUnreadCounts(
            operatorId,
            conversationIds,
            workspace.id
        );

        const totalPage = this.paginationService.totalPage(total, _limit);

        return {
            _pagination: { total, totalPage },
            data: this.conversationService.mapList(conversations, unreadCounts),
        };
    }

    @ConversationWorkspaceMarkReadDoc()
    @Response('conversation.workspace.markRead')
    @WorkspaceScopedProtected({
        subject: ENUM_POLICY_SUBJECT.CHATBOT,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/:id/read')
    async markRead(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('id') id: string,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<void> {
        const conversation =
            await this.conversationService.findOneByIdInWorkspace(
                id,
                workspace.id
            );

        if (!conversation) {
            throw new NotFoundException({
                message: 'conversation.error.notFound',
                statusCode: 404,
            });
        }

        await this.conversationService.markConversationRead(user.id, id);

        await this.activityService.createByUserWithWorkspace(user, workspace, {
            action: ENUM_ACTIVITY_ACTION.UPDATE,
            subject: ENUM_POLICY_SUBJECT.CONVERSATION,
            metadata: {
                id: conversation.id,
                name: conversation.senderId,
            },
        });
    }

    @ConversationWorkspaceGetDoc()
    @Response('conversation.workspace.get')
    @WorkspaceScopedProtected({
        subject: ENUM_POLICY_SUBJECT.CHATBOT,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/:id')
    async get(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('id') id: string
    ): Promise<IResponse<ConversationGetResponseDto>> {
        const conversation =
            await this.conversationService.findOneByIdInWorkspace(
                id,
                workspace.id,
                {
                    populate: [
                        'account',
                        'chatbot',
                        'contactPoint',
                        'contactPoint.customer',
                    ],
                }
            );

        if (!conversation) {
            throw new NotFoundException({
                message: 'conversation.error.notFound',
                statusCode: 404,
            });
        }

        return { data: this.conversationService.mapGet(conversation) };
    }

    @ConversationWorkspaceUpdateStatusDoc()
    @Response('conversation.workspace.updateStatus')
    @WorkspaceScopedProtected({
        subject: ENUM_POLICY_SUBJECT.CHATBOT,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/:id/status')
    async updateStatus(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('id') id: string,
        @Body() dto: ConversationUpdateStatusRequestDto,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<IResponse<ConversationGetResponseDto>> {
        const conversation =
            await this.conversationService.findOneByIdInWorkspace(
                id,
                workspace.id
            );

        if (!conversation) {
            throw new NotFoundException({
                message: 'conversation.error.notFound',
                statusCode: 404,
            });
        }

        const updated = await this.conversationService.updateStatus(
            id,
            dto.status,
            dto.reason
        );

        await this.activityService.createByUserWithWorkspace(user, workspace, {
            action: ENUM_ACTIVITY_ACTION.UPDATE,
            subject: ENUM_POLICY_SUBJECT.CONVERSATION,
            metadata: {
                id: conversation.id,
                name: conversation.senderId,
            },
        });

        return { data: this.conversationService.mapGet(updated) };
    }

    @ConversationWorkspaceUpdateBotDoc()
    @Response('conversation.workspace.updateBot')
    @WorkspaceScopedProtected({
        subject: ENUM_POLICY_SUBJECT.CHATBOT,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/:id/bot')
    async updateBot(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('id') id: string,
        @Body() dto: ConversationUpdateBotRequestDto,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<IResponse<ConversationGetResponseDto>> {
        const conversation =
            await this.conversationService.findOneByIdInWorkspace(
                id,
                workspace.id
            );

        if (!conversation) {
            throw new NotFoundException({
                message: 'conversation.error.notFound',
                statusCode: 404,
            });
        }

        const updated = await this.conversationService.setBotEnabled(
            id,
            dto.botEnabled,
            dto.reason
        );

        await this.activityService.createByUserWithWorkspace(user, workspace, {
            action: ENUM_ACTIVITY_ACTION.UPDATE,
            subject: ENUM_POLICY_SUBJECT.CONVERSATION,
            metadata: {
                id: conversation.id,
                name: conversation.senderId,
            },
        });

        return { data: this.conversationService.mapGet(updated) };
    }

    @ConversationWorkspaceListMessagesDoc()
    @ResponsePaging('conversation.workspace.listMessages')
    @WorkspaceScopedProtected({
        subject: ENUM_POLICY_SUBJECT.CHATBOT,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/:id/messages')
    async listMessages(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('id') id: string,
        @Query('page') page?: number,
        @Query('perPage') perPage?: number
    ): Promise<IResponsePaging<MessageGetResponseDto>> {
        const limit = perPage ? Math.min(+perPage, 100) : 50;
        const offset = page && page > 1 ? (page - 1) * limit : 0;

        const { messages, conversation, total } =
            await this.conversationMessagingService.listMessages(
                id,
                workspace.id,
                {
                    limit,
                    offset,
                }
            );

        const userNameMap =
            await this.conversationMessagingService.buildUserNameMap(messages);

        // Bound the tool-invocation query to the message page's timestamp range.
        // The lower edge uses a 5-minute buffer because invocations fire before
        // the BOT reply is persisted, so the earliest relevant invocation may
        // slightly precede the first message in the page.
        const range =
            messages.length > 0
                ? {
                      from: new Date(
                          messages[0].dateSent.getTime() - 5 * 60 * 1000
                      ),
                      to: messages[messages.length - 1].dateSent,
                  }
                : undefined;
        const invocations =
            await this.conversationMessagingService.listToolInvocations(
                id,
                range
            );

        return {
            _pagination: {
                total,
                totalPage: this.paginationService.totalPage(total, limit),
            },
            data: await this.conversationMessagingService.mapMessages(
                messages,
                conversation,
                userNameMap,
                invocations
            ),
        };
    }

    @ConversationWorkspaceSendMessageDoc()
    @Response('conversation.workspace.sendMessage')
    @WorkspaceScopedProtected({
        subject: ENUM_POLICY_SUBJECT.CHATBOT,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/:id/messages')
    async sendMessage(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('id') id: string,
        @Body() dto: ConversationSendMessageRequestDto,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<IResponse<MessageGetResponseDto>> {
        const message =
            await this.conversationMessagingService.sendOperatorReply(
                id,
                workspace.id,
                user.id,
                dto.text
            );

        const conversation =
            await this.conversationService.findOneByIdInWorkspace(
                id,
                workspace.id
            );
        const userNameMap =
            await this.conversationMessagingService.buildUserNameMap([message]);

        await this.activityService.createByUserWithWorkspace(user, workspace, {
            action: ENUM_ACTIVITY_ACTION.CREATE,
            subject: ENUM_POLICY_SUBJECT.CONVERSATION,
            metadata: {
                id,
                name: conversation?.senderId || id,
            },
        });

        return {
            data: await this.conversationMessagingService.mapMessage(
                message,
                conversation ?? undefined,
                userNameMap
            ),
        };
    }

    @ConversationWorkspaceReactToMessageDoc()
    @Response('conversation.workspace.reactToMessage')
    @WorkspaceScopedProtected({
        subject: ENUM_POLICY_SUBJECT.CHATBOT,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/:id/messages/:messageId/reactions')
    async reactToMessage(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('id') id: string,
        @Param('messageId') messageId: string,
        @Body() dto: ConversationReactToMessageRequestDto,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<IResponse<MessageGetResponseDto>> {
        const message = await this.conversationMessagingService.reactToMessage({
            conversationId: id,
            workspaceId: workspace.id,
            messageId,
            emoji: dto.emoji,
            action: dto.action,
            operatorUserId: user.id,
        });

        await this.activityService.createByUserWithWorkspace(user, workspace, {
            action: ENUM_ACTIVITY_ACTION.UPDATE,
            subject: ENUM_POLICY_SUBJECT.CONVERSATION,
            metadata: {
                id,
                name: id,
            },
        });

        return { data: message };
    }
}
