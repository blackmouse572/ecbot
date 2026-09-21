import { SingleColumnPage } from "@repo/ui/layout";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { KnowledgeBaseListTable } from "./components/knowledge-base-list-table";

export const Component = () => {
  const { t } = useTranslation();
  return (
    <SingleColumnPage>
      <Helmet>
        <title>{t("knowledgeBase.title")} - Ecbot</title>
      </Helmet>
      <KnowledgeBaseListTable />
    </SingleColumnPage>
  );
};
