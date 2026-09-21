import { RouteFocusModal } from "@/components/modals";
import { useTranslation } from "react-i18next";
import { ImportPanelForm } from "./components";

export function AccountImports() {
  const { t } = useTranslation();

  return (
    <RouteFocusModal>
      <RouteFocusModal.Title asChild>
        <span className="sr-only">{t("accounts.imports.title")}</span>
      </RouteFocusModal.Title>
      <ImportPanelForm />
    </RouteFocusModal>
  );
}
