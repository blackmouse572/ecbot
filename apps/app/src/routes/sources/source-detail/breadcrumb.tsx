import { useTrackedLink } from "@/hooks/api/tracked-links";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { Helmet } from "react-helmet-async";
import type { UIMatch } from "react-router-dom";
import { useParams } from "react-router-dom";

export function SourceDetailBreadcrumb(_props: UIMatch) {
  const { sourceId = "" } = useParams<{ sourceId: string }>();
  const { workspaceSlug } = useWorkspaceParams();
  const { link } = useTrackedLink(workspaceSlug, sourceId);

  return (
    <span>
      {link?.name ?? sourceId}
      {link?.name && (
        <Helmet>
          <title>{link.name} - Ecbot</title>
        </Helmet>
      )}
    </span>
  );
}
