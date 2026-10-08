import { ConversationRepository } from '@app/modules/conversation/repository/repositories/conversation.repository';
import { ConversationEntity } from '@app/modules/conversation/repository/entities/conversation.entity';
import { handoffEmailRecipients } from '@app/modules/conversation/utils/handoff-email-recipients.util';
import { ENUM_SEND_EMAIL_PROCESS } from '@app/modules/email/enums/email.enum';
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import { WorkspaceMemberRepository } from '@app/modules/workspace/repository/repositories/workspace-member.repository';
import { WorkSpaceRepository } from '@app/modules/workspace/repository/repositories/workspace.repository';
import { CloudTasksQueueClient } from '@app/worker/cloud-tasks-queue.client';
import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ChannelRateLimitService } from '@app/modules/platform/services/channel-rate-limit.service';
import {
    HANDOFF_EMAIL_CONVERSATION_WINDOW_SECONDS,
    HANDOFF_EMAIL_KEY_PREFIX,
    HANDOFF_EMAIL_WORKSPACE_LIMIT,
    HANDOFF_EMAIL_WORKSPACE_WINDOW_SECONDS,
} from '@app/modules/conversation/constants/handoff-email.constant';
import { randomUUID } from 'crypto';

/**
 * Emails the team when a conversation is handed to a person: the workspace
 * owner and every active member whose role can see conversations, unless
 * they turned these off. Capped per conversation and per workspace (the
 * widget is public). Runs next to the in-app notification, never fails the
 * handoff.
 */
@Injectable()
export class HandoffEmailService {
    private readonly logger = new Logger(HandoffEmailService.name);

    constructor(
        private readonly conversationRepository: ConversationRepository,
        private readonly workspaceMemberRepository: WorkspaceMemberRepository,
        private readonly workspaceRepository: WorkSpaceRepository,
        private readonly cloudTasksClient: CloudTasksQueueClient,
        private readonly moduleRef: ModuleRef
    ) {}

    // Lives in the platform module, which imports this one: resolved lazily.
    private get rateLimit(): ChannelRateLimitService {
        return this.moduleRef.get(ChannelRateLimitService, { strict: false });
    }

    /** Both windows must have room: the conversation's, then the workspace's. */
    private async withinCaps(
        conversationId: string,
        workspaceId: string
    ): Promise<boolean> {
        const conversationOk = await this.rateLimit.claim(
            `${HANDOFF_EMAIL_KEY_PREFIX}:conversation:${conversationId}`,
            1,
            HANDOFF_EMAIL_CONVERSATION_WINDOW_SECONDS
        );
        if (!conversationOk) return false;
        return this.rateLimit.claim(
            `${HANDOFF_EMAIL_KEY_PREFIX}:workspace:${workspaceId}`,
            HANDOFF_EMAIL_WORKSPACE_LIMIT,
            HANDOFF_EMAIL_WORKSPACE_WINDOW_SECONDS
        );
    }

    async send(
        conversationId: string,
        workspaceId: string,
        reason: string,
        language?: string
    ): Promise<void> {
        try {
            const [conversation, workspace, members] = await Promise.all([
                this.conversationRepository.findOneById<ConversationEntity>(
                    conversationId,
                    { populate: ['chatbot'] }
                ),
                this.workspaceRepository.findOneById<WorkspaceEntity>(
                    workspaceId,
                    { populate: ['owner'] }
                ),
                this.workspaceMemberRepository.findActiveByWorkspace(
                    workspaceId
                ),
            ]);
            if (!conversation || !workspace) return;
            // Defence in depth: callers pass both ids separately.
            if (conversation.chatbot?.workspace?.id !== workspaceId) {
                this.logger.warn(
                    `Handoff email skipped: conversation ${conversationId} is not in workspace ${workspaceId}`
                );
                return;
            }
            if (!(await this.withinCaps(conversationId, workspaceId))) {
                this.logger.log(
                    `Handoff email for conversation ${conversationId} skipped: cooldown (in-app notification still sent)`
                );
                return;
            }

            const recipients = handoffEmailRecipients(
                members as any,
                workspace.owner as any
            );
            const data = {
                chatbotName: conversation.chatbot?.name ?? workspace.name,
                workspaceName: workspace.name,
                reason,
                conversationUrl: `/${workspace.slug}/conversations/${conversationId}`,
                language,
            };

            await Promise.all(
                recipients.map(r =>
                    this.cloudTasksClient
                        .enqueue(
                            'email',
                            ENUM_SEND_EMAIL_PROCESS.HANDOFF,
                            { send: { email: r.email, name: r.name }, data },
                            {
                                taskName: `${ENUM_SEND_EMAIL_PROCESS.HANDOFF}-${conversationId}-${r.id}-${randomUUID()}`,
                            }
                        )
                        .catch((err: unknown) =>
                            this.logger.warn(
                                `Handoff email to ${r.id} for conversation ${conversationId} not queued (non-fatal): ${(err as Error)?.message}`
                            )
                        )
                )
            );
        } catch (err: unknown) {
            this.logger.warn(
                `Handoff emails for conversation ${conversationId} failed (non-fatal): ${(err as Error)?.message}`
            );
        }
    }
}
