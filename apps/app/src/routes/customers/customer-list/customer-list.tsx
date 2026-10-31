import { SingleColumnPage } from "@repo/ui/layout";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { enterprisePageAlerts } from "../../enterprise.page-alert";
import { CustomerListTable } from "./components/customer-list-table";

export function CustomerList() {
  const { t } = useTranslation();
  return (
    <SingleColumnPage>
      <Helmet>
        <title>{t("customers.title")} - Ecbot</title>
      </Helmet>
      {enterprisePageAlerts("customers").map((Alert, index) => (
        <Alert key={index} />
      ))}
      <CustomerListTable />
    </SingleColumnPage>
  );
}
