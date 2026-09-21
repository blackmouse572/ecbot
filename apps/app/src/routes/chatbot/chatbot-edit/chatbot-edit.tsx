import { RouteFocusModal } from "@/components/modals";
import { useTranslation } from "react-i18next";
import { ChatbotEditForm } from "./components";
import { useLocation, useParams } from "react-router-dom";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ROUTES } from "@/routes/constants";

export function ChatbotEdit() {
  const { t } = useTranslation();
  const { state } = useLocation();
  const { id } = useParams<{ id: string }>();
  const { workspaceSlug } = useWorkspaceParams();

  // Default return path is chatbot details page
  const defaultPrev = id
    ? `/${workspaceSlug}/${ROUTES.Chatbot}/${id}`
    : undefined;
  const prevPath = state?.prev || defaultPrev;

  return (
    <RouteFocusModal prev={prevPath}>
      <RouteFocusModal.Title asChild>
        <span className="sr-only">{t("chatbot.edit.title")}</span>
      </RouteFocusModal.Title>
      <RouteFocusModal.Description asChild>
        <span className="sr-only">{t("chatbot.edit.description")}</span>
      </RouteFocusModal.Description>
      <ChatbotEditForm />
    </RouteFocusModal>
  );
}
