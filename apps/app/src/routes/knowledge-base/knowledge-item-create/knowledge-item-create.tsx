import { useLocation, useParams } from "react-router-dom";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { RouteFocusModal } from "@/components/modals/route-focus-modal";
import { KnowledgeItemCreateForm } from "./components";
import { ROUTES } from "@/routes/constants";
import { toPrevPath } from "../../../utils";

export function KnowledgeItemCreate() {
  const { workspaceSlug } = useWorkspaceParams();
  const { knowledgeBaseId } = useParams<{ knowledgeBaseId: string }>();
  const location = useLocation();

  const prevPath = toPrevPath(
    location,
    `/${workspaceSlug}/${ROUTES.KnowledgeBase}`,
  );

  if (!knowledgeBaseId) {
    return null;
  }

  return (
    <RouteFocusModal prev={prevPath}>
      <KnowledgeItemCreateForm
        workspaceSlug={workspaceSlug}
        knowledgeBaseId={knowledgeBaseId}
      />
    </RouteFocusModal>
  );
}
