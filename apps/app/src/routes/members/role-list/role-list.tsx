import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { RoleListTable } from "./components/role-list-table";

export function RolesList() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-y-3">
      <Helmet>
        <title>{t("roles.title")} - Ecbot</title>
      </Helmet>
      <RoleListTable />
    </div>
  );
}
