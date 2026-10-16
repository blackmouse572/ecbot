import type { AccountType } from "@/components/platform-icon/platform-icon";

// Shape of the workspace dashboard analytics. Placeholder until the API
// endpoint lands; then these come from @repo/client.

export type AnalyticsRange = "7d" | "30d" | "90d";
export type AnalyticsTab =
  "conversion" | "marketing" | "bot" | "customers" | "usage";

/** A number for the period and the same number for the period before. */
export type PeriodValue = { current: number; previous: number };

export type ConversionAnalytics = {
  daily: { day: string; newCustomers: number; orders: number }[];
  /** Per channel, so the funnel can show where each channel loses people. */
  byChannel: {
    platform: AccountType;
    newCustomers: number;
    engaged: number;
    hotLeads: number;
    orders: number;
    tokensPerOrder?: number;
  }[];
  medianHoursToOrder: number;
};

export type MarketingAnalytics = {
  daily: {
    day: string;
    positive: number;
    negative: number;
    complaint: number;
  }[];
  byChannel: {
    platform: AccountType;
    conversations: number;
    positive: number;
    negative: number;
  }[];
};

export type BotAnalytics = {
  daily: { day: string; botResolved: number; handedOver: number }[];
  reasons: { key: string; tagName?: string; emoji?: string; count: number }[];
  byChatbot: {
    id: string;
    name: string;
    conversations: number;
    botResolvedRate: number;
    handoffRate: number;
    firstReplySeconds: number;
    toolErrorRate: number;
  }[];
};

export type CustomersAnalytics = {
  tags: { id: string; name: string; emoji?: string; count: number }[];
  total: number;
  untagged: number;
  daily: { day: string; newCustomers: number; returning: number }[];
  byChannel: { platform: AccountType; count: number }[];
};

export type UsageAnalytics = { used: number; limit: number };

export type UnhappyCustomer = {
  customerId: string;
  conversationId: string;
  name: string;
  platform: AccountType;
  tagName: string;
  emoji?: string;
  at: string;
};

export type WorkspaceAnalytics = {
  generatedAt: string;
  kpis: {
    conversionRate: PeriodValue;
    positiveRate: PeriodValue;
    handoffRate: PeriodValue;
    tokensPerOrder?: PeriodValue;
  };
  conversion: ConversionAnalytics;
  marketing: MarketingAnalytics;
  bot: BotAnalytics;
  customers: CustomersAnalytics;
  usage?: UsageAnalytics;
  unhappy: UnhappyCustomer[];
};
