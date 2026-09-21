import { RouteFocusModal } from "@/components/modals";
import { useTranslation } from "react-i18next";
import { OnboardJoinForm } from "./components";

export const OnboardJoin = () => {
  const { t } = useTranslation();
  return (
    <RouteFocusModal>
      <RouteFocusModal.Title asChild>
        <span className="sr-only">{t("accounts.create.title")}</span>
      </RouteFocusModal.Title>
      <RouteFocusModal.Description asChild>
        <span className="sr-only">{t("accounts.create.description")}</span>
      </RouteFocusModal.Description>
      <OnboardJoinForm />
    </RouteFocusModal>
  );
};
