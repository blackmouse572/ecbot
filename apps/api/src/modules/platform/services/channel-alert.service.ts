import { randomUUID } from 'crypto';
import { MessageService } from '@app/common/message/services/message.service';
import { AccountEntity } from '@app/modules/account/repository/entities/account.entity';
import { AccountRepository } from '@app/modules/account/repository/repositories/account.repository';
import { ENUM_SEND_EMAIL_PROCESS } from '@app/modules/email/enums/email.enum';
import {
    NotificationPriority,
    NotificationType,
} from '@app/modules/notification/enums/notification.enum';
import { NotificationService } from '@app/modules/notification/services/notification.service';
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import { WorkspaceMemberRepository } from '@app/modules/workspace/repository/repositories/workspace-member.repository';
import { WorkSpaceRepository } from '@app/modules/workspace/repository/repositories/workspace.repository';
import { CloudTasksQueueClient } from '@app/worker/cloud-tasks-queue.client';
import { MikroORM } from '@mikro-orm/core';
import { Injectable, Logger } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import {
    CHANNEL_ALERT_REMIND_SECONDS,
    CHANNEL_HEALTH_KEY_PREFIX,
    CHANNEL_LAST_ERROR_MAX_LENGTH,
    ENUM_CHANNEL_ALERT,
} from '../constants/channel-health.constant';
import { channelAlertRecipients } from '../utils/channel-alert-recipients.util';
import { describeSendError } from '../utils/send-failure.util';
import { ChannelRateLimitService } from './channel-rate-limit.service';

const NOTICE_KEY: Record<ENUM_CHANNEL_ALERT, string> = {
    [ENUM_CHANNEL_ALERT.AUTH_FAILED]: 'notification.channelAuthFailed',
    [ENUM_CHANNEL_ALERT.SEND_FAILING]: 'notification.channelSendFailing',
    [ENUM_CHANNEL_ALERT.RECOVERED]: 'notification.channelRecovered',
};

/**
 * Tells the workspace (bell + email) and the platform team (Sentry) that a
 * channel stopped delivering, and the workspace (bell only) when it works
 * again. One alert per channel and kind, repeated at most every few hours.
 */
@Injectable()
export class ChannelAlertService {
    private readonly logger = new Logger(ChannelAlertService.name);

    constructor(
        private readonly accountRepository: AccountRepository,
        private readonly workspaceRepository: WorkSpaceRepository,
        private readonly workspaceMemberRepository: WorkspaceMemberRepository,
        private readonly notificationService: NotificationService,
        private readonly messageService: MessageService,
        private readonly cloudTasksClient: CloudTasksQueueClient,
        private readonly rateLimit: ChannelRateLimitService,
        private readonly orm: MikroORM
    ) {}

    async open(
        account: AccountEntity,
        kind: ENUM_CHANNEL_ALERT.AUTH_FAILED | ENUM_CHANNEL_ALERT.SEND_FAILING,
        err: unknown
    ): Promise<void> {
        const detail = describeSendError(err).slice(
            0,
            CHANNEL_LAST_ERROR_MAX_LENGTH
        );
        const since = account.sendFailingSince ?? new Date();
        await this.accountRepository.markSendFailing(account.id, since, detail);
        account.sendFailingSince = since;
        account.lastSendError = detail;

        const fresh = await this.rateLimit.claim(
            this.alertKey(account, kind),
            1,
            CHANNEL_ALERT_REMIND_SECONDS
        );
        if (!fresh) return;

        Sentry.captureMessage(`Channel ${kind}: ${account.type}`, {
            level: 'warning',
            // One Sentry issue per platform and kind: many workspaces in the
            // same issue at once reads as that platform being down.
            fingerprint: ['channel-alert', account.type, kind],
            tags: {
                channel_alert: kind,
                account_type: account.type,
                account_id: account.id,
                workspace_id: this.workspaceId(account),
            },
            extra: { lastSendError: detail },
        });
        this.logger.warn(
            `channel alert ${kind} account=${account.id} type=${account.type}: ${detail}`
        );
        await this.notify(account, kind);
    }

    async recovered(account: AccountEntity): Promise<void> {
        await this.accountRepository.clearSendFailing(account.id);
        account.sendFailingSince = null;
        account.lastSendError = null;
        await Promise.all([
            this.rateLimit.reset(
                this.alertKey(account, ENUM_CHANNEL_ALERT.AUTH_FAILED)
            ),
            this.rateLimit.reset(
                this.alertKey(account, ENUM_CHANNEL_ALERT.SEND_FAILING)
            ),
        ]);
        this.logger.log(`channel recovered account=${account.id}`);
        await this.notify(account, ENUM_CHANNEL_ALERT.RECOVERED);
    }

    private alertKey(account: AccountEntity, kind: ENUM_CHANNEL_ALERT) {
        return `${CHANNEL_HEALTH_KEY_PREFIX}:alert:${account.id}:${kind}`;
    }

    // account.workspace is a bare reference on most send paths.
    private workspaceId(account: AccountEntity): string {
        const ws: any = account.workspace;
        return typeof ws === 'string' ? ws : ws?.id;
    }

    private async notify(
        account: AccountEntity,
        kind: ENUM_CHANNEL_ALERT
    ): Promise<void> {
        const workspaceId = this.workspaceId(account);
        const [workspace, members] = await Promise.all([
            this.workspaceRepository.findOneById<WorkspaceEntity>(workspaceId, {
                populate: ['owner'],
            }),
            this.workspaceMemberRepository.findActiveByWorkspace(workspaceId),
        ]);
        if (!workspace) return;
        await this.orm.em.populate(account, ['chatbot']);
        const language = account.chatbot?.primaryLanguage;
        const channelsUrl = `/${workspace.slug}/accounts`;
        const key = NOTICE_KEY[kind];
        const recipients = channelAlertRecipients(
            members as any,
            workspace.owner as any
        );

        await Promise.all(
            recipients.map(async r => {
                await this.notificationService.create({
                    title: this.messageService.setMessage(`${key}.title`, {
                        customLanguage: language,
                    }),
                    message: this.messageService.setMessage(`${key}.message`, {
                        customLanguage: language,
                        properties: { accountName: account.name },
                    }),
                    type:
                        kind === ENUM_CHANNEL_ALERT.RECOVERED
                            ? NotificationType.SUCCESS
                            : NotificationType.ERROR,
                    priority:
                        kind === ENUM_CHANNEL_ALERT.RECOVERED
                            ? NotificationPriority.MEDIUM
                            : NotificationPriority.HIGH,
                    recipient: r.id,
                    workspace: workspaceId,
                    metadata: {
                        actionUrl: channelsUrl,
                        actionText: this.messageService.setMessage(
                            `${key}.actionText`,
                            { customLanguage: language }
                        ),
                        data: { account: { id: account.id }, kind },
                    },
                });
                if (kind === ENUM_CHANNEL_ALERT.RECOVERED || !r.email) return;
                await this.cloudTasksClient.enqueue(
                    'email',
                    ENUM_SEND_EMAIL_PROCESS.ACCOUNT_BLOCKED,
                    {
                        send: { email: r.email, name: r.name },
                        data: {
                            accountName: account.name,
                            reconnectUrl: channelsUrl,
                            language,
                            reason: kind,
                        },
                    },
                    {
                        taskName: `${ENUM_SEND_EMAIL_PROCESS.ACCOUNT_BLOCKED}-${account.id}-${r.id}-${randomUUID()}`,
                    }
                );
            })
        );
    }
}
