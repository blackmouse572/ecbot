import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from '@app/common/pagination/enums/pagination.enum';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import {
    ENUM_MESSAGE_AUTHOR,
    ENUM_MESSAGE_DIRECTION,
    ENUM_MESSAGE_STATUS,
} from '../../enums/message.enum';
import { MessageEntity, MessageReaction } from '../entities/message.entity';

export interface IMessageUpsertData {
    direction: ENUM_MESSAGE_DIRECTION;
    authorType: ENUM_MESSAGE_AUTHOR;
    authorId: string;
    text?: string;
    attachments?: unknown[];
    raw?: unknown;
    dateSent: Date;
}

export interface IMessageOutboundData {
    authorType: ENUM_MESSAGE_AUTHOR;
    authorId: string;
    text?: string;
    attachments?: unknown[];
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

        return this.create({
            conversation: { id: conversationId } as any,
            externalId,
            ...data,
        } as any);
    }

    /** Keep what the AI saw in a message's images, so later turns remember it. */
    async describeImages(
        messageId: string,
        description: string
    ): Promise<void> {
        const message = await this.findOneById(messageId);
        if (!message?.attachments?.length) return;
        await this.updateEntity(
            { id: messageId } as any,
            {
                attachments: message.attachments.map(a =>
                    (a as { type?: unknown } | null)?.type === 'image'
                        ? { ...(a as object), description }
                        : a
                ),
            } as any
        );
    }

    async insertPendingOutbound(
        conversationId: string,
        clientNonce: string,
        data: IMessageOutboundData
    ): Promise<MessageEntity> {
        return this.create({
            conversation: { id: conversationId } as any,
            clientNonce,
            direction: ENUM_MESSAGE_DIRECTION.OUTBOUND,
            status: ENUM_MESSAGE_STATUS.PENDING,
            ...data,
        } as any);
    }

    async markOutboundSent(
        clientNonce: string,
        externalId: string
    ): Promise<void> {
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

    async countByConversation(conversationId: string): Promise<number> {
        return this.getTotal({
            conversation: conversationId,
            deletedAt: null,
        } as any);
    }

    /**
     * The `limit` MOST RECENT messages, in chronological (oldest→newest) order —
     * the AI conversation-history window. Thin alias for the newest-anchored
     * first page of {@link findByConversation}.
     */
    async findRecentByConversation(
        conversationId: string,
        limit: number
    ): Promise<MessageEntity[]> {
        return this.findByConversation(conversationId, { limit, offset: 0 });
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
}
