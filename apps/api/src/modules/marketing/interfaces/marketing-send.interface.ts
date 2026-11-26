import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import { MarketingAudiencePreviewRequestDto } from '../dtos/request/marketing-audience-preview.request.dto';
import {
    ENUM_MARKETING_REPLY_STATUS,
    ENUM_MARKETING_SEND_MODE,
    ENUM_MARKETING_SKIP_REASON,
} from '../enums/marketing-send.enum';

/** The send rules a workspace runs with: its settings or the defaults. */
export interface IMarketingSendRules {
    maxPer30Days: number;
    restAfter: number;
    restDays: number;
    sendFrom: string;
    sendTo: string;
}

/** The confirmation a "dừng" gets: on or off, and the shop's text (null = built-in). */
export interface IMarketingStopReply {
    enabled: boolean;
    text: string | null;
}

/** A customer's last message on one channel, and the conversation it is in. */
export interface IMarketingLastInbound {
    customerId: string;
    channel: ENUM_ACCOUNT_TYPE;
    conversationId: string;
    /** The page (Account) that conversation is on. */
    accountId: string;
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

/** What a shop sends: who to, how often, and the text and picture. */
export interface IMarketingSendInput {
    name: string;
    mode: ENUM_MARKETING_SEND_MODE;
    audience: MarketingAudiencePreviewRequestDto;
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
    /** Customers who opted out after their offer. */
    optedOut: number;
    lastSentAt: Date | null;
}

/** One send's results on one channel. */
export interface IMarketingSendChannelStats {
    channel: ENUM_ACCOUNT_TYPE;
    sent: number;
    replied: number;
    ordered: number;
    optedOut: number;
}

/** A customer who answered an offer, and how they stand now. */
export interface IMarketingSendReply {
    customerId: string;
    name: string | null;
    conversationId: string | null;
    /** Their first message after the offer. */
    text: string | null;
    repliedAt: Date;
    status: ENUM_MARKETING_REPLY_STATUS;
}

/** The product an offer names for one customer: the one they asked about or bought. */
export interface IMarketingProduct {
    name: string;
    imageUrl: string | null;
}
