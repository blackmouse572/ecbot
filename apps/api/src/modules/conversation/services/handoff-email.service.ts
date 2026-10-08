import { ConversationRepository } from '@app/modules/conversation/repository/repositories/conversation.repository';
import { ConversationEntity } from '@app/modules/conversation/repository/entities/conversation.entity';
import { handoffEmailRecipients } from '@app/modules/conversation/utils/handoff-email-recipients.util';
import { ENUM_SEND_EMAIL_PROCESS } from '@app/modules/email/enums/email.enum';
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import { WorkspaceMemberRepository } from '@app/modules/workspace/repository/repositories/workspace-member.repository';
import { WorkSpaceRepository } from '@app/modules/workspace/repository/repositories/workspace.repository';
import { CloudTasksQueueClient } from '@app/worker/cloud-tasks-queue.client';
import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';

/**
 * Emails the team when a conversation is handed to a person: the workspace
 * owner and every active member whose role can see conversations. Runs next
 * to the in-app notification and never fails the handoff.
 */
@Injectable()
export class HandoffEmailService {
    private readonly logger = new Logger(HandoffEmailService.name);

    constructor(
        private readonly conversationRepository: ConversationRepository,
        private readonly workspaceMemberRepository: WorkspaceMemberRepository,
        private readonly workspaceRepository: WorkSpaceRepository,
        private readonly cloudTasksClient: CloudTasksQueueClient
    ) {}

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
