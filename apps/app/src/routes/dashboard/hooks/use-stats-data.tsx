import { useAccounts } from "@/hooks/api/accounts";
import { useChatbots } from "@/hooks/api/chatbot";
import { useConversations } from "@/hooks/api/conversations";
import {
  IconCardboardsFilled,
  IconLayoutBottombarFilled,
  IconUserFilled,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import type { StatsItemProps } from "../components/stats-item";

// Only the list total is needed, so fetch a single row.
const COUNT_ONLY = { perPage: 1 };

type CountQuery = { count: number; isLoading: boolean; isError: boolean };

const countValue = ({ count, isLoading, isError }: CountQuery) =>
  isLoading || isError ? "-" : count;

export function useStatsData(): StatsItemProps[] {
  const { t } = useTranslation();
  const chatbots = useChatbots(COUNT_ONLY);
  const accounts = useAccounts(COUNT_ONLY);
  const conversations = useConversations(COUNT_ONLY);

  return [
    {
      icon: <IconCardboardsFilled className="size-4" />,
      label: t("dashboard.stats.chatbots"),
      value: countValue(chatbots),
    },
    {
      icon: <IconUserFilled className="size-4" />,
      label: t("dashboard.stats.accounts"),
      value: countValue(accounts),
    },
    {
      icon: <IconLayoutBottombarFilled className="size-4" />,
      label: t("dashboard.stats.conversations"),
      value: countValue(conversations),
    },
  ];
}
