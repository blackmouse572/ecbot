import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import { AccountEntity } from '@app/modules/account/repository/entities/account.entity';
import { AccountService } from '@app/modules/account/services/account.service';
import { MessageRepository } from '@app/modules/conversation/repository/repositories/message.repository';
import { HttpService } from '@nestjs/axios';
import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    AdapterCapabilities,
    OutboundMessage,
} from '../../interfaces/message-model';
import {
    PlatformOAuthCapability,
    PlatformOAuthTokens,
    PlatformOwnerProfile,
    PlatformUserProfile,
    PlatformWebhookEvent,
} from '../../interfaces/platform-adapter.interface';
import {
    verifyMetaChallenge,
    verifyMetaSignature,
} from '../meta/meta-webhook.util';
import { PlatformAdapter } from '../platform-adapter.base';
import {
    ThreadsProfile,
    ThreadsWebhookChange,
    ThreadsWebhookPayload,
    ThreadsWebhookValue,
} from './threads.types';

const THREADS_GRAPH_URL = 'https://graph.threads.net/v1.0';
// Threads caps a post's text at 500 characters.
const MESSAGE_LIMIT = 500;
const INBOUND_FIELDS = new Set(['replies', 'mentions']);

/**
 * Threads (Meta). The account is one Threads profile: `account.externalId` is
 * its Threads user id, which every webhook carries as `target_id`.
 *
 * Threads has no direct messages. The inbound "messages" are replies to the
 * profile's posts and posts that mention it; the conversation is keyed on the
 * author's username (the webhook carries no user id), and every outbound
 * message is published as a reply to that author's latest post.
 */
@Injectable()
export class ThreadsPlatformAdapter extends PlatformAdapter {
    readonly type = ENUM_ACCOUNT_TYPE.THREADS_ACCOUNT;
    readonly capabilities: AdapterCapabilities = {
        cards: false,
        buttons: false,
        quickReplies: false,
        // Image and video posts need a container that finishes processing
        // before it can be published; replies stay text for now.
        media: false,
        editMessage: false,
        deleteMessage: false,
        reactions: { inbound: false, outbound: false },
        typing: false,
        markRead: false,
    };

    private readonly appSecret: string;
    private readonly verifyToken: string;

    constructor(
        private readonly config: ConfigService,
        private readonly httpService: HttpService,
        private readonly accountService: AccountService,
        private readonly messageRepository: MessageRepository
    ) {
        super();
        this.appSecret = this.config.get<string>('oauth.threads.appSecret');
        // Threads webhooks are configured in the same Meta dashboard as
        // Messenger, so they share its hub.verify_token.
        this.verifyToken = this.config.get<string>('facebook.webhookSecret');
    }

    private token(account: AccountEntity): string {
        return this.accountService.decryptToken(account.accessToken);
    }

    // ----- oauth -----

    readonly oauth: PlatformOAuthCapability = {
        exchangeCode: async (): Promise<PlatformOAuthTokens> => {
            throw new UnprocessableEntityException({
                message: 'platform.error.useOAuthService',
                statusCode: 422,
            });
        },
        refresh: async (account): Promise<PlatformOAuthTokens> => ({
            accessToken: this.token(account),
        }),
        getOwnerProfile: async (account): Promise<PlatformOwnerProfile> => {
            try {
                const { data } =
                    await this.httpService.axiosRef.get<ThreadsProfile>(
                        `${THREADS_GRAPH_URL}/me`,
                        {
                            params: {
                                fields: 'id,username,name,threads_profile_picture_url',
                                access_token: this.token(account),
                            },
                        }
                    );
                return {
                    id: data.id,
                    name: data.name || data.username,
                    avatar: data.threads_profile_picture_url,
                    link: `https://www.threads.net/@${data.username}`,
                };
            } catch (error) {
                this.rethrowPlatformError(error, 'Threads getOwnerProfile');
            }
        },
    };

    // ----- webhook -----

    verifyChallenge(req: Request): Response | null {
        return verifyMetaChallenge(req, this.verifyToken);
    }

    verifySignature(
        rawBody: string,
        headers: Headers | Record<string, string>
    ): boolean {
        return verifyMetaSignature(rawBody, headers, this.appSecret);
    }

    parse(rawBody: string): PlatformWebhookEvent[] {
        let payload: ThreadsWebhookPayload;
        try {
            payload = JSON.parse(rawBody);
        } catch {
            return [];
        }
        if (!payload || typeof payload !== 'object') return [];

        const changes: { accountKey: string; change: ThreadsWebhookChange }[] =
            [];
        if (payload.target_id && payload.values) {
            const values = Array.isArray(payload.values)
                ? payload.values
                : [payload.values];
            for (const change of values) {
                changes.push({ accountKey: String(payload.target_id), change });
            }
        }
        for (const entry of payload.entry ?? []) {
            for (const change of entry.changes ?? []) {
                changes.push({ accountKey: String(entry.id), change });
            }
        }

        const fallbackTime = payload.time
            ? new Date(payload.time * 1000)
            : new Date();
        return changes.flatMap(({ accountKey, change }) => {
            const event = this.normalize(accountKey, change, fallbackTime);
            return event ? [event] : [];
        });
    }

    private normalize(
        accountKey: string,
        change: ThreadsWebhookChange,
        fallbackTime: Date
    ): PlatformWebhookEvent | null {
        const value = change?.value;
        if (!INBOUND_FIELDS.has(change?.field) || !value?.id) return null;
        if (!value.username || this.isOwnReply(accountKey, value)) return null;

        const timestamp = value.timestamp ? new Date(value.timestamp) : null;
        return {
            kind: 'message',
            accountKey,
            senderId: value.username,
            recipientId: accountKey,
            senderName: `@${value.username}`,
            externalMessageId: value.id,
            text: value.text,
            timestamp:
                timestamp && !isNaN(timestamp.getTime())
                    ? timestamp
                    : fallbackTime,
            raw: { field: change.field, ...value },
            attachments:
                value.media_type === 'IMAGE' && value.media_url
                    ? [{ type: 'image', url: value.media_url }]
                    : undefined,
        };
    }

    /**
     * Our own replies land in the `replies` feed of our posts too. Only the
     * owner of the root post can be its own author there, so drop those
     * instead of answering ourselves.
     */
    private isOwnReply(accountKey: string, value: ThreadsWebhookValue) {
        const root = value.root_post;
        return (
            !!root &&
            String(root.owner_id) === accountKey &&
            root.username === value.username
        );
    }

    // ----- fetch -----

    // Looking up another user needs the username, which is already the
    // senderId; the display name rides on the webhook as `senderName`.
    async fetchSenderProfile(
        _account: AccountEntity,
        senderId: string
    ): Promise<PlatformUserProfile> {
        return { id: senderId };
    }

    // ----- outbound -----

    protected async doSend(
        account: AccountEntity,
        senderId: string,
        msg: OutboundMessage
    ): Promise<{ externalId: string }> {
        const target = await this.messageRepository.findLatestInboundBySender(
            account.id,
            senderId
        );
        if (!target?.externalId) {
            throw new UnprocessableEntityException({
                message: 'threads.error.noReplyTarget',
                statusCode: 422,
            });
        }

        // Media never reaches here (`media: false`), nor cards (`cards: false`).
        const c = msg.content;
        const text = this.truncateGraphemes(
            c.kind === 'text' ? c.text : msg.fallbackText,
            MESSAGE_LIMIT
        );
        if (!text.trim()) {
            throw new UnprocessableEntityException({
                message: 'platform.error.emptyMessage',
                statusCode: 422,
            });
        }

        const container = await this.post<{ id: string }>(
            account,
            'threads',
            {
                media_type: 'TEXT',
                text,
                reply_to_id: target.externalId,
            },
            'Threads createReply'
        );
        const published = await this.post<{ id: string }>(
            account,
            'threads_publish',
            { creation_id: container.id },
            'Threads publishReply'
        );
        return { externalId: published.id };
    }

    private async post<T>(
        account: AccountEntity,
        edge: string,
        params: Record<string, string>,
        context: string
    ): Promise<T> {
        try {
            const { data } = await this.httpService.axiosRef.post<T>(
                `${THREADS_GRAPH_URL}/${account.externalId}/${edge}`,
                // Form body, so the token stays out of URLs and access logs.
                new URLSearchParams({
                    ...params,
                    access_token: this.token(account),
                })
            );
            return data;
        } catch (error) {
            this.rethrowPlatformError(error, context);
        }
    }
}
