import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { SkillsListTable } from "./components/skills-list-table";

export const SkillsList = () => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-y-3">
      <Helmet>
        <title>{t("skills.title")} - Ecbot</title>
      </Helmet>
      <SkillsListTable />
    </div>
  );
};
