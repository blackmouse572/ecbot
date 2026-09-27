import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { MemberListTable } from "./components/account-list-table";

const MembersPageHead = () => {
  const { t } = useTranslation();
  return <Helmet title={`${t("app.nav.members.header")} - Ecbot`} />;
};

export const MembersListPage = () => (
  <div className="flex flex-col gap-y-3">
    <MembersPageHead />
    <MemberListTable />
  </div>
);
