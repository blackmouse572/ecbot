import { Heading } from "@medusajs/ui";
import { RouteDrawer } from "@/components/modals";
import { useLocation, useParams } from "react-router-dom";
import { KnowledgeItemEditForm } from "./components";
import { toPrevPath } from "../../../utils";
import { ROUTES } from "../../constants";
import { useKnowledgeItem } from "../../../hooks/api";

export function KnowledgeItemEdit() {
  const { knowledgeBaseId, id, workspaceSlug } = useParams<{
    knowledgeBaseId: string;
    id: string;
    workspaceSlug: string;
  }>();
  const location = useLocation();
  const prev = toPrevPath(
    location,
    `/${workspaceSlug}/${ROUTES.KnowledgeBase}/${knowledgeBaseId}/item/${id}`,
  );
  const { item } = useKnowledgeItem(knowledgeBaseId!, id!);

  return (
    <RouteDrawer prev={prev}>
      <RouteDrawer.Header>
        <RouteDrawer.Title asChild>
          <Heading level="h2" className="text-xl font-semibold">
            Edit Tags
          </Heading>
        </RouteDrawer.Title>
      </RouteDrawer.Header>
      {knowledgeBaseId && id && (
        <KnowledgeItemEditForm knowledgeBaseId={knowledgeBaseId} item={item} />
      )}
    </RouteDrawer>
  );
}
