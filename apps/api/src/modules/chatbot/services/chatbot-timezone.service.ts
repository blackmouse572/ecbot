import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IChatbotTimezones } from '../interfaces/chatbot-timezone.interface';

/**
 * The single place the effective timezones are decided (#292). Business facts
 * and hours use the agent's zone; times the customer states use the
 * conversation's, which falls back to the agent's. apps/ai receives both
 * already resolved, so scheduling and the prompt always agree.
 */
@Injectable()
export class ChatbotTimezoneService {
    private readonly appTimezone: string;

    constructor(configService: ConfigService) {
        this.appTimezone = configService.get<string>('app.timezone');
    }

    resolve(
        chatbot: { timezone?: string | null },
        conversation?: { timezone?: string | null } | null
    ): IChatbotTimezones {
        const agent = chatbot.timezone || this.appTimezone;
        return { agent, customer: conversation?.timezone || agent };
    }
}
