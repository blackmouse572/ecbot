import { RouteFocusModal } from "@/components/modals";
import { useTranslation } from "react-i18next";
import { OnboardJoinForm } from "./components";

export const OnboardJoin = () => {
  const { t } = useTranslation();
  return (
    <RouteFocusModal>
      <RouteFocusModal.Title asChild>
        <span className="sr-only">{t("onboard.join.title")}</span>
      </RouteFocusModal.Title>
      <RouteFocusModal.Description asChild>
        <span className="sr-only">{t("onboard.join.description")}</span>
      </RouteFocusModal.Description>
      <OnboardJoinForm />
    </RouteFocusModal>
  );
};
