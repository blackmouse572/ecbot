import type { ConversationGetResponseDto } from "@/hooks/api/conversations";
import type { MarketingEventGetResponseDto } from "@/hooks/api/customer-marketing";
import type { OrderGetResponseDto } from "@/hooks/api/orders";
import type { CustomerActivityFilter, CustomerActivityItem } from "./types";

type Sources = {
  conversations: ConversationGetResponseDto[];
  orders: OrderGetResponseDto[];
  events: MarketingEventGetResponseDto[];
};

/**
 * The customer's history in one list, newest first: when each conversation
 * started and last moved, each order, and each label change.
 */
export const buildActivity = (
  { conversations, orders, events }: Sources,
  filter: CustomerActivityFilter = "all",
): CustomerActivityItem[] => {
  const messages = conversations.flatMap((conversation) => {
    const started: CustomerActivityItem = {
      kind: "message",
      id: `${conversation.id}:first`,
      at: conversation.createdAt,
      first: true,
      conversation,
    };
    const last = conversation.lastMessageAt;

    return last && last !== conversation.createdAt
      ? [
          {
            ...started,
            id: `${conversation.id}:last`,
            at: last,
            first: false,
          },
          started,
        ]
      : [started];
  });

  const items: CustomerActivityItem[] = [
    ...messages,
    ...orders.map((order) => ({
      kind: "order" as const,
      id: order.id,
      at: order.orderedAt ?? order.createdAt,
      order,
    })),
    ...events.map((event) => ({
      kind: "marketing" as const,
      id: event.id,
      at: event.createdAt,
      event,
    })),
  ];

  return items
    .filter((item) => filter === "all" || item.kind === filter)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
};
