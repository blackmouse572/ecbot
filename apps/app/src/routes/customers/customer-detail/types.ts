import type { ConversationGetResponseDto } from "@/hooks/api/conversations";
import type { MarketingEventGetResponseDto } from "@/hooks/api/customer-marketing";
import type { OrderGetResponseDto } from "@/hooks/api/orders";
import type {
  CUSTOMER_ACTIVITY_FILTERS,
  CUSTOMER_DETAIL_TABS,
} from "./constants";

export type CustomerDetailTab = (typeof CUSTOMER_DETAIL_TABS)[number];

export type CustomerActivityFilter = (typeof CUSTOMER_ACTIVITY_FILTERS)[number];

/** One line of the Hoạt động timeline. */
export type CustomerActivityItem =
  | {
      kind: "message";
      id: string;
      at: string;
      // The conversation's first message, else its latest.
      first: boolean;
      conversation: ConversationGetResponseDto;
    }
  | { kind: "order"; id: string; at: string; order: OrderGetResponseDto }
  | {
      kind: "marketing";
      id: string;
      at: string;
      event: MarketingEventGetResponseDto;
    };
