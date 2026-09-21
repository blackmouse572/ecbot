import { RouteFocusModal } from "@/components/modals";
import { useTranslation } from "react-i18next";
import { RoleCreateForm } from "./components/role-create-form/role-create-form";

export function RoleCreate() {
  const { t } = useTranslation();

  return (
    <RouteFocusModal>
      <RouteFocusModal.Title asChild>
        <span className="sr-only">{t("roles.actions.create")}</span>
      </RouteFocusModal.Title>
      <RoleCreateForm />
    </RouteFocusModal>
  );
}
