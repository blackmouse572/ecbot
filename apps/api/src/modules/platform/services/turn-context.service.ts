import { TokenUsageDelta } from '@app/modules/chatbot/interfaces/token-usage-wire.interface';
import {
    AIDescribedImages,
    ChatbotAIService,
} from '@app/modules/chatbot/services/chatbot-ai.service';
import {
    ENUM_MESSAGE_AUTHOR,
    ENUM_MESSAGE_DIRECTION,
} from '@app/modules/conversation/enums/message.enum';
import { IMessageAttachment } from '@app/modules/conversation/interfaces/message-media.interface';
import { MessageEntity } from '@app/modules/conversation/repository/entities/message.entity';
import { MessageRepository } from '@app/modules/conversation/repository/repositories/message.repository';
import { MessageMediaService } from '@app/modules/conversation/services/message-media.service';
import {
    attachmentNote,
    customerHistoryText,
    isVisual,
    replyNote,
    withDescriptions,
} from '@app/modules/conversation/utils/message-attachment';
import { Injectable, Logger } from '@nestjs/common';
import {
    imageDescriptionNote,
    UNVIEWABLE_IMAGE_NOTE,
} from '../constants/media.constant';
import { ITurnBurst, ITurnContext } from '../interfaces/turn-context.interface';
import { ConversationMemoryService } from './conversation-memory.service';

/** Starts a staff reply in the history; AGENT.md names the same label. */
const STAFF_REPLY_LABEL = '[Staff]';

/** One burst image: its message, its position there, and what we know. */
interface IBurstImage {
    message: MessageEntity;
    index: number;
    attachment: IMessageAttachment;
    url?: string;
    description?: string;
}

/** What the agent reads for a burst photo, sticker or story. */
function burstImageNote(image: IBurstImage): string {
    const { attachment, description, message } = image;
    if (attachment.type !== 'image')
        return attachmentNote(
            { ...attachment, description },
            message.replyTo?.kind === 'story'
        );
    return description
        ? imageDescriptionNote(description)
        : UNVIEWABLE_IMAGE_NOTE;
}

/**
 * Builds what apps/ai gets for a Turn from the conversation's rows (the
 * agent is stateless, so context comes from the DB each Turn). The burst is
 * the rows of the messages the Turn answers, found by id (a reply to an
 * earlier burst can sit between them); what came before is history, as
 * far back as the memory window reaches, and what came before that is the
 * conversation summary. Burst images not yet described
 * are described once, in one apps/ai call, and kept on their image so later
 * Turns remember them.
 */
@Injectable()
export class TurnContextService {
    private readonly logger = new Logger(TurnContextService.name);

    constructor(
        private readonly messageRepository: MessageRepository,
        private readonly messageMedia: MessageMediaService,
        private readonly chatbotAIService: ChatbotAIService,
        private readonly memory: ConversationMemoryService
    ) {}

    /** `burst`: the customer messages this Turn answers (none for a
     *  follow-up, which answers none). */
    async build(
        conversationId: string,
        burst: ITurnBurst,
        chatbotId: string
    ): Promise<ITurnContext> {
        const { texts } = burst;
        const { summary, rows: recent } = await this.memory.window(
            conversationId,
            texts.length
        );
        const burstRows = new Set(this.burstRows(recent, burst));
        // History is what came before the burst; rows saved after it belong
        // to the next Turn.
        const lastBurst = Math.max(
            -1,
            ...recent.flatMap((m, i) => (burstRows.has(m) ? [i] : []))
        );
        const earlier = burstRows.size ? recent.slice(0, lastBurst) : recent;

        // The bot's own images stay out: the model copied an assistant
        // "[image]" into its replies, and its text says what it showed.
        const history = earlier
            .filter(m => !burstRows.has(m))
            .map(m => {
                const inbound = m.direction === ENUM_MESSAGE_DIRECTION.INBOUND;
                // Staff replies go out like the bot's own; the label tells the
                // bot what staff already took on, so it is not handed over
                // again (AGENT.md <escalation>).
                const staff =
                    m.authorType === ENUM_MESSAGE_AUTHOR.OPERATOR && m.text
                        ? STAFF_REPLY_LABEL
                        : '';
                // A platform note is not the bot's own words: it reads as
                // context, like the customer's side.
                const system = m.authorType === ENUM_MESSAGE_AUTHOR.SYSTEM;
                return {
                    role:
                        inbound || system
                            ? ('user' as const)
                            : ('assistant' as const),
                    content: inbound
                        ? customerHistoryText(m)
                        : [staff, m.text].filter(Boolean).join(' '),
                };
            })
            .filter(m => m.content);

        const rows = [...burstRows];
        const images = await this.burstImages(rows, conversationId);
        const usage = await this.describe(images, chatbotId);
        const notes = images.map(burstImageNote);
        const others = rows.flatMap(m =>
            (m.attachments ?? [])
                .filter(a => !isVisual(a))
                .map(a => attachmentNote(a))
        );
        const quotes = rows.map(m => replyNote(m.replyTo));

        return {
            summary,
            history,
            message: [...quotes, texts.join('\n'), ...notes, ...others]
                .filter(Boolean)
                .join('\n'),
            usage,
        };
    }

    private burstRows(
        recent: MessageEntity[],
        { texts, messageIds }: ITurnBurst
    ): MessageEntity[] {
        if (messageIds?.length) {
            const ids = new Set(messageIds);
            return recent.filter(m => ids.has(m.id));
        }
        if (!texts.length) return [];
        return recent
            .filter(m => m.direction === ENUM_MESSAGE_DIRECTION.INBOUND)
            .slice(-texts.length);
    }

    private async burstImages(
        rows: MessageEntity[],
        conversationId: string
    ): Promise<IBurstImage[]> {
        const perRow = await Promise.all(
            rows.map(async message => {
                const stored = message.attachments ?? [];
                const resolved = await this.messageMedia.resolve(
                    stored,
                    conversationId
                );
                return stored.flatMap((attachment, index) =>
                    isVisual(attachment)
                        ? [
                              {
                                  message,
                                  index,
                                  attachment,
                                  url: resolved[index]?.url,
                                  description: attachment.description,
                              },
                          ]
                        : []
                );
            })
        );
        return perRow.flat();
    }

    /** Describe the images that have a url but no description yet, in one
     *  call, and keep each description on its image. A failure leaves them
     *  undescribed: the Turn goes on and says it could not view them. */
    private async describe(
        images: IBurstImage[],
        chatbotId: string
    ): Promise<TokenUsageDelta | undefined> {
        const pending = images.filter(i => i.url && !i.description);
        if (!pending.length) return undefined;
        const id = (i: IBurstImage) => `${i.message.id}:${i.index}`;

        let described: AIDescribedImages;
        try {
            described = await this.chatbotAIService.describeImages({
                chatbot_id: chatbotId,
                images: pending.map(i => ({
                    id: id(i),
                    url: i.url!,
                    // Stickers are read for what they mean, not described.
                    ...(i.attachment.type === 'sticker' && {
                        kind: 'sticker' as const,
                    }),
                })),
            });
        } catch (err) {
            this.logger.warn(
                `Describing burst images failed: ${(err as Error).message}`
            );
            return undefined;
        }

        const byId = new Map(
            described.images.map(d => [d.id, d.description ?? undefined])
        );
        for (const image of pending) image.description = byId.get(id(image));

        // Only new descriptions, by position, per message: one write each.
        const updates = new Map<MessageEntity, (string | undefined)[]>();
        for (const image of pending) {
            if (!image.description) continue;
            const descriptions = updates.get(image.message) ?? [];
            descriptions[image.index] = image.description;
            updates.set(image.message, descriptions);
        }
        await Promise.all(
            [...updates].map(([message, descriptions]) =>
                this.messageRepository.updateAttachments(
                    message.id,
                    withDescriptions(message.attachments ?? [], descriptions)
                )
            )
        );
        return described.usage;
    }
}
