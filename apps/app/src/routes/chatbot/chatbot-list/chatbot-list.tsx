import { SingleColumnPage } from "@repo/ui/layout";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { ChatbotListTable } from "./components/chatbot-list-table/chatbot-list-table";

export function ChatbotList() {
  const { t } = useTranslation();
  return (
    <SingleColumnPage>
      <Helmet>
        <title>{t("chatbot.title")} - Ecbot</title>
      </Helmet>
      <ChatbotListTable />
    </SingleColumnPage>
  );
}
