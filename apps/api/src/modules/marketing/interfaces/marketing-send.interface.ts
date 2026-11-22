import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import { ENUM_MARKETING_SKIP_REASON } from '../enums/marketing-send.enum';
import { IMarketingAudience } from './marketing-audience.interface';

/** The send rules a workspace runs with: its settings or the defaults. */
export interface IMarketingSendRules {
    maxPer30Days: number;
    restAfter: number;
    restDays: number;
    sendFrom: string;
    sendTo: string;
}

/** A customer's last message on one channel, and the conversation it is in. */
export interface IMarketingLastInbound {
    customerId: string;
    channel: ENUM_ACCOUNT_TYPE;
    conversationId: string;
    lastInboundAt: Date;
}

/** The free route to one customer, or why there is none. */
export type IMarketingRoute =
    | {
          customerId: string;
          channel: ENUM_ACCOUNT_TYPE;
          /** The conversation the customer last wrote in on that channel. */
          conversationId: string;
          /** Null: the window never closes (Telegram). */
          openUntil: Date | null;
      }
    | {
          customerId: string;
          skip: ENUM_MARKETING_SKIP_REASON;
          /** WINDOW_CLOSED: the channel the customer wrote on last. */
          channel?: ENUM_ACCOUNT_TYPE;
      };

/** What a shop sends: who to, and the fixed text and picture. */
export interface IMarketingSendInput {
    audience: IMarketingAudience;
    text: string;
    imageUrl?: string | null;
}

/** How a send went, counted from its messages. */
export interface IMarketingSendStats {
    queued: number;
    sent: number;
    failed: number;
    skipped: number;
    /** Sent offers answered within 72 hours. */
    replied: number;
    /** Customers who ordered within 7 days of their offer. */
    ordered: number;
    /** Those orders' total, in minor units. */
    revenue: number;
}
