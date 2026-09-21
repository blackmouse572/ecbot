import { useWorkspace } from "@/hooks/api/workspace";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";

export const Breadcrumb = () => {
  const { t } = useTranslation();
  const { workspace } = useWorkspace();

  if (!workspace) {
    return null;
  }

  const title = t("workspace.details.title");

  return (
    <span>
      {title}
      <Helmet>
        <title>
          {workspace.name} - {title} - Ecbot
        </title>
      </Helmet>
    </span>
  );
};
