import { RouteFocusModal } from "@/components/modals";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { AccountCreateForm } from "./components";

export function AccountCreate() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();

  return (
    <RouteFocusModal>
      <RouteFocusModal.Title asChild>
        <span className="sr-only">{t("accounts.create.title")}</span>
      </RouteFocusModal.Title>
      <RouteFocusModal.Description asChild>
        <span className="sr-only">{t("accounts.create.description")}</span>
      </RouteFocusModal.Description>
      <AccountCreateForm initialPlatform={searchParams.get("platform")} />
    </RouteFocusModal>
  );
}
