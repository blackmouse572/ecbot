import { queryKeysFactory } from "@/libs/query-factory";

export const CHATBOT_QUERY_KEY = "chatbot" as const;
export const chatbotQueryKeys = {
  ...queryKeysFactory(CHATBOT_QUERY_KEY),
};
