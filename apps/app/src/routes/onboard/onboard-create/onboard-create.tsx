import { RouteFocusModal } from "@/components/modals";
import { useTranslation } from "react-i18next";
import { OnboardCreateForm } from "../onboard-select/components";

export const OnboardCreate = () => {
  const { t } = useTranslation();

  return (
    <RouteFocusModal>
      <RouteFocusModal.Title asChild>
        <span className="sr-only">{t("onboard.create.title")}</span>
      </RouteFocusModal.Title>
      <RouteFocusModal.Description asChild>
        <span className="sr-only">{t("onboard.create.description")}</span>
      </RouteFocusModal.Description>
      <OnboardCreateForm />
    </RouteFocusModal>
  );
};
