import type { WorkspaceAnalytics } from "@/hooks/api/workspace-analytics";
import type { RequestPaginationDto } from "@/libs/query-types";
import {
  Bolt,
  ChatBubbleLeftRight,
  Link,
  SquaresPlus,
  Sparkles,
} from "@medusajs/icons";
import { ROUTES } from "@/routes/constants";

// The dashboard stats need only each list's total, so fetch a single row.
export const STATS_COUNT_QUERY = { perPage: 1 };

/** Active agents only. The list endpoint filters on `status`, which the
 * generated pagination type does not declare. */
export const ACTIVE_CHATBOT_COUNT_QUERY = {
  perPage: 1,
  status: ["active"],
} as Partial<RequestPaginationDto>;

/** Enough channels to tell whether any one answers through an agent; a
 * workspace still on the checklist has only a few. */
export const LINKED_ACCOUNT_QUERY = { perPage: 50 };

/** Getting-started checklist, in order. Paths are relative to the workspace;
 * each icon matches the sidebar nav's icon for the page the step leads to. */
export const GETTING_STARTED_STEPS = [
  { key: "chatbot", path: `${ROUTES.Chatbot}/create`, icon: Sparkles },
  { key: "account", path: `${ROUTES.Accounts}/create`, icon: SquaresPlus },
  { key: "link", path: ROUTES.Accounts, icon: Link },
  { key: "activate", path: ROUTES.Chatbot, icon: Bolt },
  {
    key: "conversation",
    path: ROUTES.Conversations,
    icon: ChatBubbleLeftRight,
  },
] as const;

/** Dashboard analytics tabs in order, each shown only to a member who can
 * read every subject it counts. */
export const ANALYTICS_TABS = [
  { value: "conversion", subjects: ["CUSTOMER"] },
  // Conversations are gated on CHATBOT, like the conversations page:
  // CONVERSATION is not a subject a workspace role can be granted.
  { value: "marketing", subjects: ["CUSTOMER", "CHATBOT"] },
  { value: "bot", subjects: ["CHATBOT"] },
  { value: "customers", subjects: ["CUSTOMER"] },
] as const;

const NO_CHANGE = { current: 0, previous: 0 };

/** Stands in for a section while it loads, so its cards render at full
 * height with loading placeholders instead of popping in later. */
export const LOADING_ANALYTICS: Required<WorkspaceAnalytics> = {
  conversion: {
    generatedAt: "",
    conversionRate: NO_CHANGE,
    daily: [],
    byChannel: [],
    medianHoursToOrder: 0,
  },
  marketing: {
    generatedAt: "",
    positiveRate: NO_CHANGE,
    daily: [],
    byChannel: [],
    unhappy: [],
  },
  bot: {
    generatedAt: "",
    handoffRate: NO_CHANGE,
    daily: [],
    reasons: [],
    byChatbot: [],
  },
  customers: {
    generatedAt: "",
    tags: [],
    total: 0,
    untagged: 0,
    daily: [],
    byChannel: [],
  },
};
