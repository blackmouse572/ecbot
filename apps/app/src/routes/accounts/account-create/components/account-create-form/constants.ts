import type { RequestPaginationDto } from "@/libs/query-types";

/** The agents the connect dialog offers: the five made most recently,
 * leaving out archived ones, which cannot answer. */
export const LINK_AGENT_CHATBOT_QUERY = {
  page: 1,
  perPage: 5,
  orderBy: "createdAt",
  orderDirection: "DESC" as const,
  status: "active,inactive",
} satisfies Partial<RequestPaginationDto> & { status: string };
