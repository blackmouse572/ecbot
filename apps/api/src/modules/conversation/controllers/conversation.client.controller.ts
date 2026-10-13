import {
    PaginationQuery,
    PaginationQueryFilterEqual,
    PaginationQueryFilterInBoolean,
    PaginationQueryFilterInEnum,
} from '@app/common/pagination/decorators/pagination.decorator';
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
import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
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
    CONVERSATION_DEFAULT_ACCOUNT_TYPE,
    CONVERSATION_DEFAULT_AVAILABLE_SEARCH,
    CONVERSATION_DEFAULT_STATUS,
} from '../constants/conversation.list.constant';
import {
    ConversationClientGetDoc,
    ConversationClientListDoc,
    ConversationClientListMessagesDoc,
    ConversationClientSendMessageDoc,
    ConversationClientUpdateBotDoc,
    ConversationClientUpdateStatusDoc,
} from '../docs/conversation.client.doc';
import { ConversationSendMessageRequestDto } from '../dtos/request/conversation.send-message.request.dto';
import { ConversationUpdateBotRequestDto } from '../dtos/request/conversation.update-bot.request.dto';
import { ConversationUpdateStatusRequestDto } from '../dtos/request/conversation.update-status.request.dto';
import { ConversationGetResponseDto } from '../dtos/response/conversation.get.response.dto';
import { MessageGetResponseDto } from '../dtos/response/message.get.response.dto';
import { ENUM_CONVERSATION_STATUS } from '../enums/conversation.enum';
import { ConversationEntity } from '../repository/entities/conversation.entity';
import { ConversationMessagingService } from '../services/conversation-messaging.service';
import { ConversationService } from '../services/conversation.service';

// 3rd-party surface: authenticated by x-api-key (ClientCredential), tenant
// derived from the credential (no :workspace param). See ADR-0012. Where the
// workspace routes act as the signed-in operator (unread counts, replies,
// the activity log), this acts as the credential's creator.
@ApiTags('modules.client.conversation')
@Controller('/conversations')
export class ConversationClientController {
    constructor(
        private readonly conversationService: ConversationService,
        private readonly paginationService: PaginationService,
        private readonly conversationMessagingService: ConversationMessagingService,
        private readonly activityService: ActivityService
    ) {}

    @ConversationClientListDoc()
    @ResponsePaging('conversation.workspace.list')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.CHATBOT,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @Get('/')
    async list(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @ClientCredentialPayload() credential: ClientCredentialEntity,
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
        const unreadCounts = await this.conversationService.getUnreadCounts(
            credential.createdBy?.id,
            conversations.map(c => c.id),
            workspace.id
        );

        return {
            _pagination: {
                total,
                totalPage: this.paginationService.totalPage(total, _limit),
            },
            data: this.conversationService.mapList(conversations, unreadCounts),
        };
    }

    @ConversationClientGetDoc()
    @Response('conversation.workspace.get')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.CHATBOT,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @Get('/:id')
    async get(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @ClientCredentialPayload() credential: ClientCredentialEntity,
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

        await this.activityService.createView(
            credential.createdBy?.id,
            workspace,
            ENUM_POLICY_SUBJECT.CONVERSATION,
            { id: conversation.id }
        );

        return { data: this.conversationService.mapGet(conversation) };
    }

    @ConversationClientListMessagesDoc()
    @ResponsePaging('conversation.workspace.listMessages')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.CHATBOT,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @Get('/:id/messages')
    async listMessages(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @ClientCredentialPayload() credential: ClientCredentialEntity,
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
                { limit, offset }
            );

        // Paging through a conversation is one read: log the first page.
        if (offset === 0) {
            await this.activityService.createView(
                credential.createdBy?.id,
                workspace,
                ENUM_POLICY_SUBJECT.CONVERSATION,
                { id: conversation.id, resource: 'messages' }
            );
        }

        const userNameMap =
            await this.conversationMessagingService.buildUserNameMap(messages);
        // Same window as the workspace route: invocations fire before the
        // bot reply is saved, so start 5 minutes before the first message.
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

    @ConversationClientSendMessageDoc()
    @Response('conversation.workspace.sendMessage')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.CHATBOT,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @Post('/:id/messages')
    async sendMessage(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @ClientCredentialPayload() credential: ClientCredentialEntity,
        @Param('id') id: string,
        @Body() dto: ConversationSendMessageRequestDto
    ): Promise<IResponse<MessageGetResponseDto>> {
        const message =
            await this.conversationMessagingService.sendOperatorReply(
                id,
                workspace.id,
                credential.createdBy.id,
                dto.text
            );

        const conversation =
            await this.conversationService.findOneByIdInWorkspace(
                id,
                workspace.id
            );
        const userNameMap =
            await this.conversationMessagingService.buildUserNameMap([message]);

        await this.activityService.createByUserWithWorkspace(
            credential.createdBy,
            workspace,
            {
                action: ENUM_ACTIVITY_ACTION.CREATE,
                subject: ENUM_POLICY_SUBJECT.CONVERSATION,
                metadata: { id, name: conversation?.senderId || id },
            }
        );

        return {
            data: await this.conversationMessagingService.mapMessage(
                message,
                conversation ?? undefined,
                userNameMap
            ),
        };
    }

    @ConversationClientUpdateStatusDoc()
    @Response('conversation.workspace.updateStatus')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.CHATBOT,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @Patch('/:id/status')
    async updateStatus(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @ClientCredentialPayload() credential: ClientCredentialEntity,
        @Param('id') id: string,
        @Body() dto: ConversationUpdateStatusRequestDto
    ): Promise<IResponse<ConversationGetResponseDto>> {
        const conversation = await this.findConversationOrFail(workspace, id);

        const updated = await this.conversationService.updateStatus(
            id,
            dto.status,
            dto.reason
        );
        await this.logUpdate(workspace, credential, conversation);

        return { data: this.conversationService.mapGet(updated) };
    }

    @ConversationClientUpdateBotDoc()
    @Response('conversation.workspace.updateBot')
    @ClientCredentialProtected({
        subject: ENUM_POLICY_SUBJECT.CHATBOT,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @Patch('/:id/bot')
    async updateBot(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @ClientCredentialPayload() credential: ClientCredentialEntity,
        @Param('id') id: string,
        @Body() dto: ConversationUpdateBotRequestDto
    ): Promise<IResponse<ConversationGetResponseDto>> {
        const conversation = await this.findConversationOrFail(workspace, id);

        const updated = await this.conversationService.setBotEnabled(
            id,
            dto.botEnabled,
            dto.reason
        );
        await this.logUpdate(workspace, credential, conversation);

        return { data: this.conversationService.mapGet(updated) };
    }

    // Missing and cross-workspace look the same: 404.
    private async findConversationOrFail(
        workspace: WorkspaceEntity,
        id: string
    ): Promise<ConversationEntity> {
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
        return conversation;
    }

    private async logUpdate(
        workspace: WorkspaceEntity,
        credential: ClientCredentialEntity,
        conversation: ConversationEntity
    ): Promise<void> {
        await this.activityService.createByUserWithWorkspace(
            credential.createdBy,
            workspace,
            {
                action: ENUM_ACTIVITY_ACTION.UPDATE,
                subject: ENUM_POLICY_SUBJECT.CONVERSATION,
                metadata: {
                    id: conversation.id,
                    name: conversation.senderId,
                },
            }
        );
    }
}
