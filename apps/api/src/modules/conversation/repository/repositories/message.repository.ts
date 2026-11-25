import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from '@app/common/pagination/enums/pagination.enum';
import { ENUM_ACTIVITY_ACTION } from '@app/modules/activity/enums/activity.enum';
import { EntityManager, FilterQuery } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import {
    ENUM_MESSAGE_AUTHOR,
    ENUM_MESSAGE_DIRECTION,
    ENUM_MESSAGE_STATUS,
} from '../../enums/message.enum';
import {
    IMessageAttachment,
    IMessageReplyTo,
} from '../../interfaces/message-media.interface';
import { IUnansweredInboundRow } from '../../interfaces/message.interface';
import { ConversationEntity } from '../entities/conversation.entity';
import { MessageEntity, MessageReaction } from '../entities/message.entity';

export interface IMessageUpsertData {
    direction: ENUM_MESSAGE_DIRECTION;
    authorType: ENUM_MESSAGE_AUTHOR;
    authorId: string;
    text?: string;
    attachments?: IMessageAttachment[];
    replyTo?: IMessageReplyTo;
    raw?: unknown;
    dateSent: Date;
    /** Imported by reconciliation and never answered (ADR-0009). */
    replayed?: boolean;
}

export interface IMessageOutboundData {
    authorType: ENUM_MESSAGE_AUTHOR;
    authorId: string;
    text?: string;
    attachments?: IMessageAttachment[];
    dateSent: Date;
}

@Injectable()
export class MessageRepository extends DatabaseRepository<MessageEntity> {
    constructor(em: EntityManager) {
        super(em, MessageEntity);
    }

    async upsertByExternalId(
        conversationId: string,
        externalId: string,
        data: IMessageUpsertData
    ): Promise<MessageEntity> {
        const existing = await this.findOne({
            conversation: conversationId,
            externalId,
        } as any);

        if (existing) {
            return existing;
        }

        const message = await this.create({
            conversation: { id: conversationId } as any,
            externalId,
            ...data,
        } as any);
        // Inbound messages are touched by the inbound path (touchLastMessage).
        if (data.direction === ENUM_MESSAGE_DIRECTION.OUTBOUND) {
            await this.touchConversation(conversationId, data.dateSent);
        }
        return message;
    }

    /** The conversation's message with this platform id, if we have it. */
    async findByExternalId(
        conversationId: string,
        externalId: string
    ): Promise<MessageEntity | null> {
        return this.findOne({
            conversation: conversationId,
            externalId,
            deletedAt: null,
        } as FilterQuery<MessageEntity>);
    }

    /** Replace a message's attachments (e.g. with the descriptions of what
     *  the AI saw in its images, so later Turns remember them). */
    async updateAttachments(
        messageId: string,
        attachments: IMessageAttachment[]
    ): Promise<void> {
        // One UPDATE: nothing else in the Turn's unit of work is flushed.
        await this.updateRaw({ id: messageId }, { attachments });
    }

    async insertPendingOutbound(
        conversationId: string,
        clientNonce: string,
        data: IMessageOutboundData
    ): Promise<MessageEntity> {
        const message = await this.create({
            conversation: { id: conversationId } as any,
            clientNonce,
            direction: ENUM_MESSAGE_DIRECTION.OUTBOUND,
            status: ENUM_MESSAGE_STATUS.PENDING,
            ...data,
        } as any);
        await this.touchConversation(conversationId, data.dateSent);
        return message;
    }

    /** The inbox sorts by lastMessageAt: any new message, bot and staff
     *  replies included, moves its conversation to the top. */
    private async touchConversation(
        conversationId: string,
        at: Date
    ): Promise<void> {
        await this.em.nativeUpdate(
            ConversationEntity,
            { id: conversationId },
            { lastMessageAt: at }
        );
    }

    async markOutboundSent(
        clientNonce: string,
        externalId: string
    ): Promise<void> {
        // The platform's echo of this send can be processed first. Without
        // an app id to mark it as ours (Instagram), processEcho stored it as
        // an operator message under this externalId: drop that copy so the
        // real row can take the id under UQ_messages_conversation_externalId.
        const pending = await this.findOne({ clientNonce } as any);
        if (pending) {
            await this.em.nativeDelete(MessageEntity, {
                conversation: pending.conversation,
                externalId,
                clientNonce: null,
                authorType: ENUM_MESSAGE_AUTHOR.OPERATOR,
            } as any);
        }
        await this.updateEntity(
            { clientNonce } as any,
            { externalId, status: ENUM_MESSAGE_STATUS.SENT } as any
        );
    }

    async markOutboundFailed(clientNonce: string): Promise<void> {
        await this.updateEntity(
            { clientNonce } as any,
            { status: ENUM_MESSAGE_STATUS.FAILED } as any
        );
    }

    /** For a send whose delivery is confirmed only after the row is SENT
     *  (the API channel's callback retries). */
    async markOutboundFailedByExternalId(externalId: string): Promise<void> {
        await this.updateEntity(
            {
                externalId,
                direction: ENUM_MESSAGE_DIRECTION.OUTBOUND,
            } as FilterQuery<MessageEntity>,
            { status: ENUM_MESSAGE_STATUS.FAILED } as any
        );
    }

    /**
     * Return a page of messages anchored at the NEWEST end of the conversation,
     * in chronological (oldest→newest) reading order.
     *
     * `offset` counts back from the newest message, so `{ offset: 0, limit: 50 }`
     * is the most recent 50 and `{ offset: 50, limit: 50 }` is the 50 before
     * those — the shape an infinite "scroll up to load older" thread needs. We
     * query DESC (so the DB slice starts at the newest) then reverse each page
     * back to chronological. A plain ASC + offset would page from the START of
     * the thread, which is why opening a conversation used to show its oldest
     * messages first (issue #245).
     */
    async findByConversation(
        conversationId: string,
        options?: { limit?: number; offset?: number }
    ): Promise<MessageEntity[]> {
        const rows = await this.find(
            { conversation: conversationId, deletedAt: null } as any,
            {
                orderBy: { dateSent: 'DESC' } as any,
                paging:
                    options?.limit !== undefined
                        ? { limit: options.limit, offset: options.offset ?? 0 }
                        : undefined,
            }
        );
        return rows.reverse();
    }

    /** The newest `limit` messages sent since `since`, oldest first. */
    async findByConversationSince(
        conversationId: string,
        since: Date,
        limit: number
    ): Promise<MessageEntity[]> {
        const rows = await this.find(
            {
                conversation: conversationId,
                dateSent: { $gte: since },
                deletedAt: null,
            } as any,
            {
                orderBy: { dateSent: 'DESC' } as any,
                paging: { limit, offset: 0 },
            }
        );
        return rows.reverse();
    }

    async countByConversation(conversationId: string): Promise<number> {
        return this.getTotal({
            conversation: conversationId,
            deletedAt: null,
        } as any);
    }

    /**
     * Filter for the conversation's messages after `cursorId` (all of them
     * without one): what the memory summary does not cover yet. Ordered on
     * (`dateSent`, `id`) like {@link findAfter}, so two rows sharing a
     * millisecond never straddle the cursor. The cursor row is looked up even
     * when deleted, so deleting it does not rewind the summary.
     */
    async afterCursorFilter(
        conversationId: string,
        cursorId?: string
    ): Promise<FilterQuery<MessageEntity>> {
        const cursor = cursorId
            ? await this.findOne({
                  id: cursorId,
                  conversation: conversationId,
              } as any)
            : null;
        return {
            conversation: conversationId,
            deletedAt: null,
            ...(cursor
                ? {
                      $or: [
                          { dateSent: { $gt: cursor.dateSent } },
                          { dateSent: cursor.dateSent, id: { $gt: cursor.id } },
                      ],
                  }
                : {}),
        } as FilterQuery<MessageEntity>;
    }

    /** `filter` narrowed to rows up to and including `untilId`, looked up
     *  within the conversation like the cursor in {@link afterCursorFilter}. */
    async untilFilter(
        conversationId: string,
        filter: FilterQuery<MessageEntity>,
        untilId: string
    ): Promise<FilterQuery<MessageEntity> | null> {
        const until = await this.findOne({
            id: untilId,
            conversation: conversationId,
        } as any);
        if (!until) return null;
        return {
            $and: [
                filter,
                {
                    $or: [
                        { dateSent: { $lt: until.dateSent } },
                        { dateSent: until.dateSent, id: { $lte: until.id } },
                    ],
                },
            ],
        } as FilterQuery<MessageEntity>;
    }

    /** The oldest `limit` rows matching `filter`, oldest→newest. */
    async findOldest(
        filter: FilterQuery<MessageEntity>,
        limit: number
    ): Promise<MessageEntity[]> {
        return this.find(filter, {
            orderBy: { dateSent: 'ASC', id: 'ASC' } as any,
            paging: { limit, offset: 0 },
        });
    }

    /** The newest `limit` rows matching `filter`, oldest→newest. */
    async findNewest(
        filter: FilterQuery<MessageEntity>,
        limit: number
    ): Promise<MessageEntity[]> {
        const rows = await this.find(filter, {
            orderBy: { dateSent: 'DESC', id: 'DESC' } as any,
            paging: { limit, offset: 0 },
        });
        return rows.reverse();
    }

    /**
     * Messages sent after `afterMessageId`, oldest→newest — the cursor read the
     * website widget polls with while its chat window is open.
     *
     * Unlike {@link findByConversation} this pages forward from a cursor rather
     * than backward from the newest, because a poller wants what it has not seen
     * yet, not the tail of the thread. The cursor is looked up within the
     * conversation, so an id from another conversation seeks nowhere and the
     * caller just gets the thread from the start.
     */
    async findAfter(
        conversationId: string,
        afterMessageId: string | undefined,
        limit: number
    ): Promise<MessageEntity[]> {
        const cursor = afterMessageId
            ? await this.findOne({
                  id: afterMessageId,
                  conversation: conversationId,
                  deletedAt: null,
              } as any)
            : null;

        return this.find(
            {
                conversation: conversationId,
                deletedAt: null,
                // The website widget polls this for the visitor: staff-side
                // notes stay out.
                authorType: { $ne: ENUM_MESSAGE_AUTHOR.SYSTEM },
                // Tie-broken on id, not `dateSent` alone. `dateSent` comes from
                // `new Date()`, so two messages can share a millisecond; if such
                // a pair straddles a page boundary, a `$gt: dateSent` cursor
                // would exclude the trailing one from every later poll and lose
                // it silently. The orderBy below must match this ordering.
                ...(cursor
                    ? {
                          $or: [
                              { dateSent: { $gt: cursor.dateSent } },
                              {
                                  dateSent: cursor.dateSent,
                                  id: { $gt: cursor.id },
                              },
                          ],
                      }
                    : {}),
            } as any,
            {
                orderBy: { dateSent: 'ASC', id: 'ASC' } as any,
                paging: { limit, offset: 0 },
            }
        );
    }

    async applyReaction(
        conversationId: string,
        externalId: string,
        input: {
            emoji: string;
            actorType: MessageReaction['actorType'];
            actorId?: string;
            reactionExternalId?: string;
            action: 'react' | 'unreact';
        }
    ): Promise<MessageEntity | null> {
        const message = await this.findOne({
            conversation: conversationId,
            externalId,
            deletedAt: null,
        } as any);

        if (!message) {
            return null;
        }

        const reactions = message.reactions ?? [];
        const matchesEntry = (entry: MessageReaction) =>
            entry.emoji === input.emoji &&
            entry.actorType === input.actorType &&
            entry.actorId === input.actorId;

        if (input.action === 'react') {
            if (!reactions.some(matchesEntry)) {
                reactions.push({
                    emoji: input.emoji,
                    actorType: input.actorType,
                    actorId: input.actorId,
                    externalId: input.reactionExternalId,
                    at: new Date().toISOString(),
                });
            }
            message.reactions = reactions;
        } else {
            message.reactions = reactions.filter(entry => !matchesEntry(entry));
        }

        await this.em.persistAndFlush(message);
        return message;
    }

    // NOTE: unlike `findByConversation` (which uses `find()` + a raw `orderBy`
    // option), the base `findOne()` only honours `options.order` (an
    // IPaginationOrder), not a raw `orderBy` key — passing `orderBy` here would
    // silently no-op the sort. Use `order` so the DESC sort actually reaches
    // the underlying MikroORM call.
    async findLatestInbound(
        conversationId: string
    ): Promise<MessageEntity | null> {
        return this.findOne(
            {
                conversation: conversationId,
                direction: ENUM_MESSAGE_DIRECTION.INBOUND,
                deletedAt: null,
            } as any,
            {
                order: {
                    dateSent: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC,
                },
            } as any
        );
    }

    /**
     * The customer's latest inbound message on an account, across that
     * account's conversations with them. Threads replies must name the post
     * they answer, and this is the one the customer last wrote.
     */
    async findLatestInboundBySender(
        accountId: string,
        senderId: string
    ): Promise<MessageEntity | null> {
        return this.findOne(
            {
                conversation: { account: accountId, senderId },
                direction: ENUM_MESSAGE_DIRECTION.INBOUND,
                externalId: { $ne: null },
                deletedAt: null,
            } as any,
            {
                order: {
                    dateSent: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC,
                },
            } as any
        );
    }

    /**
     * One inbound customer message if the bot left it unanswered. Raw SQL: it
     * spans messages, conversations, chatbots, workspaces and activities, and
     * has to read rows the Turn never touched.
     *
     * Answered means a later SENT outbound row (BOT/OPERATOR/SYSTEM) or a
     * handoff raised after the message. A PENDING or FAILED send is a miss:
     * rows are inserted PENDING and only flipped SENT when the platform
     * accepts them, so a crashed or rejected send left the customer with
     * nothing. Replayed history, handed-over or resolved conversations, a
     * turned-off chatbot and a suspended workspace are deliberate silences.
     */
    async findUnansweredInboundById(
        messageId: string
    ): Promise<IUnansweredInboundRow | null> {
        // MikroORM types execute() as `any`; the columns are the SELECT's.
        const rows = (await this.em.getConnection().execute(
            `SELECT m.id AS message_id,
                    m.created_at,
                    conv.id AS conversation_id,
                    conv.chatbot_id,
                    cb.workspace_id,
                    acc.type AS platform
               FROM messages m
               JOIN conversations conv ON conv.id = m.conversation_id
               JOIN chatbots cb ON cb.id = conv.chatbot_id
               JOIN workspaces w ON w.id = cb.workspace_id
               JOIN accounts acc ON acc.id = conv.account_id
              WHERE m.id = ?
                AND m.direction = 'INBOUND'
                AND m.author_type = 'USER'
                AND m.replayed = false
                AND m.deleted_at IS NULL
                AND conv.bot_enabled = true
                AND conv.status = 'OPEN'
                AND conv.resolved_at IS NULL
                AND conv.handoff_at IS NULL
                AND conv.deleted_at IS NULL
                AND cb.status = 'active'
                AND cb.deleted_at IS NULL
                AND w.status <> 'SUSPENDED'
                AND w.deleted_at IS NULL
                AND acc.deleted_at IS NULL
                AND NOT EXISTS (
                    SELECT 1
                      FROM messages r
                     WHERE r.conversation_id = conv.id
                       AND r.direction = 'OUTBOUND'
                       AND r.author_type IN ('BOT', 'OPERATOR', 'SYSTEM')
                       AND r.status = 'SENT'
                       AND r.deleted_at IS NULL
                       AND r.created_at >= m.created_at
                )
                AND NOT EXISTS (
                    SELECT 1
                      FROM activities a
                     WHERE a.action = '${ENUM_ACTIVITY_ACTION.CONVERSATION_HANDOFF}'
                       AND a.metadata->>'id' = conv.id::text
                       AND a.deleted_at IS NULL
                       AND a.created_at >= m.created_at
                )
              LIMIT 1`,
            [messageId]
        )) as Array<{
            message_id: string;
            created_at: Date;
            conversation_id: string;
            chatbot_id: string;
            workspace_id: string;
            platform: string;
        }>;

        const row = rows[0];
        if (!row) return null;

        return {
            messageId: row.message_id,
            createdAt: row.created_at,
            conversationId: row.conversation_id,
            chatbotId: row.chatbot_id,
            workspaceId: row.workspace_id,
            platform: row.platform,
        };
    }
}
