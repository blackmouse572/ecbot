import { SingleColumnPage } from "@repo/ui/layout";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { FollowupsTable } from "./components/followups-table/followups-table";

export function FollowupsList() {
  const { t } = useTranslation();
  return (
    <SingleColumnPage>
      <Helmet>
        <title>{t("followups.title")} - Ecbot</title>
      </Helmet>
      <FollowupsTable />
    </SingleColumnPage>
  );
}
