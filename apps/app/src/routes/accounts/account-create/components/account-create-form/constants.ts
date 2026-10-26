/** The agents the connect dialog offers: the five touched most recently,
 * leaving out archived ones, which cannot answer. */
export const LINK_AGENT_CHATBOT_QUERY = {
  page: 1,
  perPage: 5,
  orderBy: "updatedAt",
  orderDirection: "DESC",
  status: ["active", "inactive"],
} as const;
