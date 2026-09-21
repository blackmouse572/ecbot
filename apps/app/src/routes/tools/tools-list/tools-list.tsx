import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { ToolsListTable } from "./components/tools-list-table";

export const ToolsList = () => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-y-3">
      <Helmet>
        <title>{t("tools.title")} - Ecbot</title>
      </Helmet>
      <ToolsListTable />
    </div>
  );
};
