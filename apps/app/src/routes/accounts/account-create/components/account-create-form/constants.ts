/** The agents the connect dialog offers: the five made most recently,
 * leaving out archived ones, which cannot answer. */
export const LINK_AGENT_CHATBOT_QUERY = {
  page: 1,
  perPage: 5,
  orderBy: "createdAt",
  orderDirection: "DESC",
  status: "active,inactive",
} as const;
