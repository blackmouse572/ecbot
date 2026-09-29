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
import { STATS_COUNT_QUERY } from "../constants";
import { countValue } from "../utils";

export function useStatsData(): StatsItemProps[] {
  const { t } = useTranslation();
  const chatbots = useChatbots(STATS_COUNT_QUERY);
  const accounts = useAccounts(STATS_COUNT_QUERY);
  const conversations = useConversations(STATS_COUNT_QUERY);

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
