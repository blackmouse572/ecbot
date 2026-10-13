import type { RequestPaginationDto } from "@/libs/query-types";
import { ROUTES } from "@/routes/constants";

/** Only each list's total is needed; the same query as the dashboard stats,
 * so both share one request. */
export const COUNT_QUERY = { perPage: 1 };

/** Active agents only. The list endpoint filters on `status`, which the
 * generated pagination type does not declare. */
export const ACTIVE_CHATBOT_COUNT_QUERY = {
  perPage: 1,
  status: ["active"],
} as Partial<RequestPaginationDto>;

/** Enough channels to tell whether any one answers through an agent; a
 * workspace still on the checklist has only a few. */
export const LINKED_ACCOUNT_QUERY = { perPage: 50 };

/** Getting-started checklist, in order. Paths are relative to the workspace. */
export const GETTING_STARTED_STEPS = [
  { key: "chatbot", path: `${ROUTES.Chatbot}/create` },
  { key: "account", path: `${ROUTES.Accounts}/create` },
  { key: "activate", path: ROUTES.Chatbot },
  { key: "conversation", path: ROUTES.Conversations },
] as const;
