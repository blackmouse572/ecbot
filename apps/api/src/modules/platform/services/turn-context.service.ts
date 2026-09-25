import { ENUM_MESSAGE_DIRECTION } from '@app/modules/conversation/enums/message.enum';
import { MessageRepository } from '@app/modules/conversation/repository/repositories/message.repository';
import { MessageMediaService } from '@app/modules/conversation/services/message-media.service';
import {
    forTurn,
    historyNote,
} from '@app/modules/conversation/utils/message-attachment';
import { Injectable } from '@nestjs/common';
import { UNVIEWABLE_IMAGE_NOTE } from '../constants/media.constant';
import { MESSAGE_HISTORY_WINDOW } from '../constants/message-debounce.constant';
import { ITurnContext } from '../interfaces/turn-context.interface';

/**
 * Builds what apps/ai gets for a Turn from the conversation's rows (the
 * agent is stateless, so context comes from the DB each Turn). The burst is
 * the customer's last `burst.length` rows (a reply to an earlier burst can
 * sit between them); everything before is history.
 */
@Injectable()
export class TurnContextService {
    constructor(
        private readonly messageRepository: MessageRepository,
        private readonly messageMedia: MessageMediaService
    ) {}

    /** `burst`: the texts of the customer messages this Turn answers ([] for
     *  a follow-up, which answers none). */
    async build(
        conversationId: string,
        burst: string[]
    ): Promise<ITurnContext> {
        const recent = await this.messageRepository.findRecentByConversation(
            conversationId,
            MESSAGE_HISTORY_WINDOW + burst.length
        );
        const burstRows = new Set(
            burst.length
                ? recent
                      .filter(
                          m => m.direction === ENUM_MESSAGE_DIRECTION.INBOUND
                      )
                      .slice(-burst.length)
                : []
        );

        // The bot's own images stay out: the model copied an assistant
        // "[image]" into its replies, and its text says what it showed.
        const history = recent
            .filter(m => !burstRows.has(m))
            .map(m => {
                const inbound = m.direction === ENUM_MESSAGE_DIRECTION.INBOUND;
                const note = inbound ? historyNote(m.attachments ?? []) : '';
                return {
                    role: inbound ? ('user' as const) : ('assistant' as const),
                    content: [m.text, note].filter(Boolean).join(' '),
                };
            })
            .filter(m => m.content);

        const images = await Promise.all(
            [...burstRows].map(async m => ({
                id: m.id,
                ...forTurn(
                    await this.messageMedia.resolve(
                        m.attachments,
                        conversationId
                    )
                ),
            }))
        );
        const unviewable = images.flatMap(m =>
            Array<string>(m.unviewable).fill(UNVIEWABLE_IMAGE_NOTE)
        );

        return {
            history,
            message: [burst.join('\n'), ...unviewable]
                .filter(Boolean)
                .join('\n'),
            attachments: images.flatMap(m =>
                m.urls.map(url => ({ attachment_id: m.id, preview_url: url }))
            ),
        };
    }
}
