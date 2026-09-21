import { SingleColumnPage } from "@repo/ui/layout";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { ActivityListTable } from "./components";

export const ActivityList = () => {
  const { t } = useTranslation();
  return (
    <SingleColumnPage>
      <div className="flex flex-col gap-y-3">
        <Helmet>
          <title>{t("app.nav.activity.header")} - Ecbot</title>
        </Helmet>
        <ActivityListTable />
      </div>
    </SingleColumnPage>
  );
};
