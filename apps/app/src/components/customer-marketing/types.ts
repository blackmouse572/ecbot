import type { CustomerMarketingSummaryResponseDto } from "@repo/client";

export type CustomerStage = CustomerMarketingSummaryResponseDto["stage"];

export type CustomerPermission =
  CustomerMarketingSummaryResponseDto["permission"];
