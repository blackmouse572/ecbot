import { Injectable, Logger } from '@nestjs/common';
import { MessageService } from '@app/common/message/services/message.service';
import { NotificationService } from '@app/modules/notification/services/notification.service';
import {
    NotificationPriority,
    NotificationType,
} from '@app/modules/notification/enums/notification.enum';
import { WorkspaceMemberRepository } from '@app/modules/workspace/repository/repositories/workspace-member.repository';
import { ENUM_KNOWLEDGE_FAILURE_KIND } from '../constants/knowledge-ingest.constant';
import { KnowledgeItemService } from './knowledge-item.service';

/**
 * Tells the owner in-app when a knowledge item fails to process or to sync its
 * chatbot links, so a broken item (the agent silently answering without it,
 * #92) is visible and can be re-linked or processed again.
 */
@Injectable()
export class KnowledgeFailureNotifierService {
    private readonly logger = new Logger(KnowledgeFailureNotifierService.name);

    constructor(
        private readonly knowledgeItemService: KnowledgeItemService,
        private readonly notificationService: NotificationService,
        private readonly workspaceMemberRepository: WorkspaceMemberRepository,
        private readonly messageService: MessageService
    ) {}

    /** Never throws: a notification problem must not fail the ingest task. */
    async notifyFailed(
        knowledgeItemId: string,
        kind: ENUM_KNOWLEDGE_FAILURE_KIND
    ): Promise<void> {
        try {
            // Populated relations are not on the entity type (createdBy is Rel<any>).
            const item: any = await this.knowledgeItemService.findOneById(
                knowledgeItemId,
                {
                    populate: [
                        'createdBy',
                        'knowledgeBase',
                        'knowledgeBase.workspace',
                    ],
                }
            );
            if (!item) return;

            const workspace = item.knowledgeBase?.workspace;
            const recipients = await this.recipientsFor(
                item.createdBy?.id,
                workspace?.id
            );
            const key =
                kind === ENUM_KNOWLEDGE_FAILURE_KIND.LINK_SYNC
                    ? 'knowledgeItem.notification.linkSyncFailed'
                    : 'knowledgeItem.notification.ingestFailed';

            await Promise.all(
                recipients.map(recipient =>
                    this.notificationService.create({
                        title: this.messageService.setMessage(`${key}.title`),
                        message: this.messageService.setMessage(
                            `${key}.message`,
                            { properties: { title: item.title } }
                        ),
                        type: NotificationType.ERROR,
                        priority: NotificationPriority.HIGH,
                        recipient,
                        metadata: {
                            actionUrl: `/${workspace?.slug}/knowledge-base/${item.knowledgeBase?.id}/item/${item.id}`,
                            actionText: this.messageService.setMessage(
                                'knowledgeItem.notification.actionText'
                            ),
                            data: { knowledgeItemId: item.id, kind },
                        },
                    })
                )
            );
        } catch (err: unknown) {
            this.logger.error(
                `failure notification failed item=${knowledgeItemId} kind=${kind}: ${String(err)}`
            );
        }
    }

    private async recipientsFor(
        creatorId: string | undefined,
        workspaceId: string | undefined
    ): Promise<string[]> {
        if (creatorId) return [creatorId];
        if (!workspaceId) return [];
        const members =
            await this.workspaceMemberRepository.findActiveByWorkspace(
                workspaceId
            );
        return members.map(m => m.user?.id).filter(Boolean);
    }
}
