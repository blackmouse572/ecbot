import { ChatbotEntity } from '@app/modules/chatbot/repository/entities/chatbot.entity';
import { ConversationEntity } from '@app/modules/conversation/repository/entities/conversation.entity';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IANAZone } from 'luxon';

/**
 * The single place apps/api decides which IANA zone an agent's wall-clock
 * times mean. Mirrors apps/ai `resolve_timezone`: agent timezone, else
 * APP_TIMEZONE, else UTC. A bad stored value never breaks a turn.
 */
@Injectable()
export class ChatbotTimezoneService {
    private readonly appTimezone: string;

    constructor(private readonly configService: ConfigService) {
        this.appTimezone = this.configService.get<string>('app.timezone');
    }

    resolveAgentTimezone(
        chatbot: Pick<ChatbotEntity, 'timezone'> | null | undefined
    ): string {
        return (
            [chatbot?.timezone, this.appTimezone].find(
                zone => !!zone && IANAZone.isValidZone(zone)
            ) ?? 'UTC'
        );
    }

    /** The zone a conversation's wall-clock times mean (#292 puts the conversation's own zone first). */
    resolveConversationTimezone(
        conversation: Pick<ConversationEntity, 'chatbot'>
    ): string {
        return this.resolveAgentTimezone(conversation.chatbot);
    }
}
