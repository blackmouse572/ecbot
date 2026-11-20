import { useTranslation } from "react-i18next";
import type { StageKey } from "../types";

/** The stage's name, as the customer list and side panel show it. */
export const useStageLabel = () => {
  const { t } = useTranslation();
  return (stage: StageKey) =>
    stage === "DORMANT"
      ? t("customerMarketing.dormant")
      : t(`customerMarketing.stage.${stage}`);
};
