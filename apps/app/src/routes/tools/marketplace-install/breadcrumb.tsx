import { useGetToolkitDetail } from "@/hooks/api/tools";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import type { UIMatch } from "react-router-dom";
import { useParams } from "react-router-dom";

type MarketplaceInstallBreadcrumbProps = UIMatch;

export function MarketplaceInstallBreadcrumb(
  _props: MarketplaceInstallBreadcrumbProps,
) {
  const { slug } = useParams<{ slug: string }>();
  const { workspaceSlug } = useWorkspaceParams();

  const { toolkit } = useGetToolkitDetail(workspaceSlug, slug ?? "", {
    enabled: !!slug,
  });

  return <span>{toolkit?.name ?? slug}</span>;
}
