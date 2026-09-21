import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { AccountListTable } from "./components/account-list-table";

export function AccountsList() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-y-3">
      <Helmet>
        <title>{t("app.nav.accounts.header")} - Ecbot</title>
      </Helmet>
      <AccountListTable />
    </div>
  );
}
