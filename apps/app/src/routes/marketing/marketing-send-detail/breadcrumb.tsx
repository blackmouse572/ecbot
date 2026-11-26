import { useMarketingSend } from "@/hooks/api/marketing-sends";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { Helmet } from "react-helmet-async";
import type { UIMatch } from "react-router-dom";
import { useParams } from "react-router-dom";

export function MarketingSendDetailBreadcrumb(_props: UIMatch) {
  const { sendId = "" } = useParams<{ sendId: string }>();
  const { workspaceSlug } = useWorkspaceParams();
  const { send } = useMarketingSend(workspaceSlug, sendId);

  return (
    <span>
      {send?.name ?? sendId}
      {send?.name && (
        <Helmet>
          <title>{send.name} - Ecbot</title>
        </Helmet>
      )}
    </span>
  );
}
