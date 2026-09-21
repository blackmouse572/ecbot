import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { SessionsTable } from "./components";

export const Sessions = () => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-y-3">
      <Helmet>
        <title>{t("sessions.domain")} - Ecbot</title>
      </Helmet>
      <SessionsTable />
    </div>
  );
};
