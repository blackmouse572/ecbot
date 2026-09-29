import { ROUTES } from "@/routes/constants";

// The dashboard stats need only each list's total, so fetch a single row.
export const STATS_COUNT_QUERY = { perPage: 1 };

// Getting-started checklist, in order. `path` is relative to the workspace.
export const GETTING_STARTED_STEPS = [
  { key: "chatbot", path: `${ROUTES.Chatbot}/create` },
  { key: "account", path: `${ROUTES.Accounts}/create` },
  { key: "conversation", path: ROUTES.Conversations },
] as const;
