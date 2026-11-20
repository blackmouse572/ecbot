import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import { AccountEntity } from '@app/modules/account/repository/entities/account.entity';
import { AccountService } from '@app/modules/account/services/account.service';
import { MessageRepository } from '@app/modules/conversation/repository/repositories/message.repository';
import { HttpService } from '@nestjs/axios';
import {
    HttpException,
    Injectable,
    Logger,
    UnprocessableEntityException,
} from '@nestjs/common';
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
} from './threads.types';

const THREADS_GRAPH_URL = 'https://graph.threads.net/v1.0';
// Threads caps a post's text at 500 characters, counting each emoji as its
// UTF-8 bytes.
const MESSAGE_LIMIT = 500;
const EMOJI = /\p{Extended_Pictographic}/u;
const INBOUND_FIELDS = new Set(['replies', 'mentions']);

/** The customer's post, then the post it answered, then the thread's root. */
function replyTargets(message: {
    externalId?: string;
    raw?: unknown;
}): string[] {
    const raw = message.raw as ThreadsWebhookChange['value'] | undefined;
    const ids = [
        message.externalId,
        raw?.replied_to?.id,
        raw?.root_post?.id,
    ].filter((id): id is string => typeof id === 'string' && id.length > 0);
    return [...new Set(ids)];
}

/** Graph "object does not exist or cannot be loaded" (code 100, subcode 33). */
function isMissingObject(error: unknown): boolean {
    if (!(error instanceof HttpException)) return false;
    const body = error.getResponse() as {
        platformError?: { error?: { code?: number; error_subcode?: number } };
    };
    const graph = body?.platformError?.error;
    return graph?.code === 100 && graph?.error_subcode === 33;
}

/**
 * Threads (Meta). The account is one Threads profile: `account.externalId` is
 * its Threads user id. `target_id` only carries that id for `mentions`; a
 * `replies` webhook puts the *post's* id there, so those are routed on the
 * root post's owner (see {@link accountKeyFor}).
 *
 * Threads has no direct messages. The inbound "messages" are replies to the
 * profile's posts and posts that mention it; the conversation is keyed on the
 * author's username (the webhook carries no user id), and every outbound
 * message is published as a reply to that author's latest post.
 */
@Injectable()
export class ThreadsPlatformAdapter extends PlatformAdapter {
    private readonly logger = new Logger(ThreadsPlatformAdapter.name);

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
                    link: `https://www.threads.com/@${data.username}`,
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
                const accountKey = this.accountKeyFor(
                    change,
                    payload.target_id
                );
                if (!accountKey) {
                    // A reply we cannot route would otherwise disappear
                    // silently, including from logInboundLag's events= count.
                    this.logger.warn(
                        `Threads reply dropped, no root post owner to route on: id=${change?.value?.id}`
                    );
                    continue;
                }
                changes.push({ accountKey, change });
            }
        }
        // The classic envelope (not what Threads actually sends, but accepted
        // for symmetry with the other Meta platforms) keys each change on
        // `entry.id`, which is the receiving profile there — not a post id.
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

    /**
     * The profile a change belongs to. Meta's docs are explicit that
     * `target_id` is "the media's ID for a replies or delete webhook, or the
     * mentioned Threads user's app-scoped user ID for a mentions webhook", so
     * keying every event on it made the processor look a post up as if it were
     * a profile and drop the whole comment. For replies the linked profile is
     * the root post's owner; a reply with no root-post owner cannot be routed,
     * so it is dropped (our own replies come back on this feed too).
     */
    private accountKeyFor(
        change: ThreadsWebhookChange,
        targetId: string
    ): string | null {
        if (change?.field === 'replies') {
            const ownerId = change.value?.root_post?.owner_id;
            return ownerId ? String(ownerId) : null;
        }
        return String(targetId);
    }

    private normalize(
        accountKey: string,
        change: ThreadsWebhookChange,
        fallbackTime: Date
    ): PlatformWebhookEvent | null {
        const value = change?.value;
        if (!INBOUND_FIELDS.has(change?.field) || !value?.id) return null;
        if (!value.username) return null;
        // Our own replies land in the `replies` feed of our posts too, and
        // answering ourselves would loop. Routing already established that the
        // root post belongs to this account (see accountKeyFor), so the author
        // is the only remaining tell: if it is the root post's own author, it
        // is us.
        if (
            change.field === 'replies' &&
            value.root_post?.username === value.username
        )
            return null;

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
        const text = this.truncateToLimit(
            c.kind === 'text' ? c.text : msg.fallbackText
        );
        if (!text.trim()) {
            throw new UnprocessableEntityException({
                message: 'platform.error.emptyMessage',
                statusCode: 422,
            });
        }

        const container = await this.createReply(
            account,
            text,
            replyTargets(target)
        );
        const published = await this.post<{ id: string }>(
            account,
            'threads_publish',
            { creation_id: container.id },
            'Threads publishReply'
        );
        return { externalId: published.id };
    }

    /**
     * Threads can delete or filter a post after its webhook fired (seen on a
     * reply under an old post), and then answers "does not exist". Walk up the
     * thread instead of failing: the post it replied to, then the root post.
     */
    private async createReply(
        account: AccountEntity,
        text: string,
        targets: string[]
    ): Promise<{ id: string }> {
        for (const [i, replyToId] of targets.entries()) {
            try {
                return await this.post<{ id: string }>(
                    account,
                    'threads',
                    { media_type: 'TEXT', text, reply_to_id: replyToId },
                    'Threads createReply'
                );
            } catch (error) {
                if (i === targets.length - 1 || !isMissingObject(error))
                    throw error;
                this.logger.warn(
                    `Threads reply target ${replyToId} is gone, trying ${targets[i + 1]}`
                );
            }
        }
    }

    /** Cuts on grapheme boundaries so the text fits Threads' 500 limit, where
     *  an emoji weighs its UTF-8 bytes and anything else weighs one. */
    private truncateToLimit(text: string): string {
        const weight = (g: string) =>
            EMOJI.test(g) ? Buffer.byteLength(g, 'utf8') : 1;
        const seg = new Intl.Segmenter('und', { granularity: 'grapheme' });
        const graphemes = [...seg.segment(text)].map(s => s.segment);
        if (graphemes.reduce((n, g) => n + weight(g), 0) <= MESSAGE_LIMIT) {
            return text;
        }
        const suffix = '...';
        let used = suffix.length;
        let keep = '';
        for (const g of graphemes) {
            used += weight(g);
            if (used > MESSAGE_LIMIT) break;
            keep += g;
        }
        return keep + suffix;
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
