import type {
  AnalyticsBotResponseDto,
  AnalyticsConversionResponseDto,
  AnalyticsCustomersResponseDto,
  AnalyticsMarketingResponseDto,
  AnalyticsPeriodValueDto,
  AnalyticsUnhappyCustomerDto,
} from "@repo/client";

export type AnalyticsRange = "7d" | "30d" | "90d";
export type AnalyticsTab = "conversion" | "marketing" | "bot" | "customers";

/** A number for the period and the same number for the period before. */
export type PeriodValue = AnalyticsPeriodValueDto;

export type ConversionAnalytics = AnalyticsConversionResponseDto;
export type MarketingAnalytics = AnalyticsMarketingResponseDto;
export type BotAnalytics = AnalyticsBotResponseDto;
export type CustomersAnalytics = AnalyticsCustomersResponseDto;
export type UnhappyCustomer = AnalyticsUnhappyCustomerDto;

/** One section per tab, present only for tabs the member may see. */
export type WorkspaceAnalytics = {
  conversion?: ConversionAnalytics;
  marketing?: MarketingAnalytics;
  bot?: BotAnalytics;
  customers?: CustomersAnalytics;
};
