import { ChatbotEntity } from '@app/modules/chatbot/repository/entities/chatbot.entity';
import { ConversationEntity } from '@app/modules/conversation/repository/entities/conversation.entity';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IANAZone } from 'luxon';
import { IChatbotTimezones } from '../interfaces/chatbot-timezone.interface';

/**
 * The single place the effective timezones are decided. Business facts and
 * hours use the agent's zone (agent timezone, else APP_TIMEZONE, else UTC);
 * times the customer states use the conversation's zone, which falls back to
 * the agent's (#292). apps/ai receives both already resolved, so scheduling
 * and the prompt always agree. A bad stored value never breaks a turn.
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
        return this.firstValid(chatbot?.timezone, this.appTimezone) ?? 'UTC';
    }

    /** The zone a conversation's wall-clock times mean. */
    resolveConversationTimezone(
        conversation: Pick<ConversationEntity, 'chatbot' | 'timezone'>
    ): string {
        return this.resolve(conversation.chatbot, conversation).customer;
    }

    resolve(
        chatbot: Pick<ChatbotEntity, 'timezone'> | null | undefined,
        conversation?: Pick<ConversationEntity, 'timezone'> | null
    ): IChatbotTimezones {
        const agent = this.resolveAgentTimezone(chatbot);
        return {
            agent,
            customer: this.firstValid(conversation?.timezone) ?? agent,
        };
    }

    private firstValid(...zones: (string | null | undefined)[]) {
        return zones.find(zone => !!zone && IANAZone.isValidZone(zone));
    }
}
