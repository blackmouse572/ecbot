import { useGetToolkitDetail, useStartInstall } from "@/hooks/api/tools";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import {
  Badge,
  Button,
  Container,
  Divider,
  Heading,
  Skeleton,
  Text,
  toast,
} from "@medusajs/ui";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { ToolLogo } from "../components/tool-logo";

export const MarketplaceInstall = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { workspaceSlug } = useWorkspaceParams();
  const { slug } = useParams<{ slug: string }>();

  const { startInstall, isPending } = useStartInstall(workspaceSlug);
  const { toolkit, isLoading } = useGetToolkitDetail(
    workspaceSlug,
    slug ?? "",
    { enabled: !!slug },
  );

  const name = toolkit?.name ?? slug ?? "";
  const description = toolkit?.meta.description ?? "";
  const logo = toolkit?.meta.logo ?? "";
  const categories = toolkit?.meta.categories as
    Array<{ id: string; name: string }> | undefined;

  const handleInstall = async () => {
    if (!slug) return;
    try {
      const callbackUrl = `${window.location.origin}/${workspaceSlug}/tools/marketplace/callback`;
      const res = await startInstall({ toolkitSlug: slug, callbackUrl });
      const data = (res?.data as A)?.data as
        | { sessionId?: string; redirectUrl?: string; toolId?: string }
        | undefined;
      const sessionId = data?.sessionId;
      const redirectUrl = data?.redirectUrl;
      const toolId = data?.toolId;

      if (!sessionId) {
        toast.error(t("tools.marketplace.installErrorToast"));
        return;
      }

      if (!redirectUrl) {
        // No-auth or immediate install — backend returns toolId when ready
        if (!toolId) {
          toast.error(t("tools.marketplace.installErrorToast"));
          return;
        }
        toast.success(t("tools.marketplace.installSuccessToast"));
        navigate(`/${workspaceSlug}/tools/${toolId}`);
        return;
      }

      // OAuth redirect — sessionId is already embedded in callbackUrl by backend
      toast.info(t("tools.marketplace.installingToast"));
      window.location.href = redirectUrl;
    } catch (error) {
      console.error("Error starting install:", error);
      toast.error(t("tools.marketplace.installErrorToast"));
    }
  };

  const handleBack = () => navigate(`/${workspaceSlug}/tools/marketplace`);

  if (!slug) {
    return (
      <Container className="p-6">
        <Text size="small" className="text-ui-fg-subtle">
          {t("tools.marketplace.noResults")}
        </Text>
      </Container>
    );
  }

  return (
    <div className="flex flex-col gap-y-3">
      <Helmet>
        <title>
          {name} · {t("tools.marketplace.title")} - Ecbot
        </title>
      </Helmet>
      <Container className="p-0">
        <div className="flex items-start gap-x-4 px-6 py-6">
          <ToolLogo
            name={name}
            logo={logo}
            isLoading={isLoading}
            size="xlarge"
          />
          <div className="flex flex-1 flex-col gap-y-1">
            {isLoading ? (
              <>
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-64" />
              </>
            ) : (
              <>
                <Heading level="h1">{name}</Heading>
                <div className="flex flex-col gap-y-1">
                  {categories && categories.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {categories.map((c) => (
                        <Badge key={c.id} size="2xsmall">
                          {c.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
        <Divider />
        <div className="px-6 py-4">
          {description && (
            <Text size="small" className="text-ui-fg-subtle">
              {description}
            </Text>
          )}
        </div>
        <Divider />
        <div className="flex items-center justify-end gap-x-2 px-6 py-4">
          <Button type="button" variant="secondary" onClick={handleBack}>
            {t("actions.cancel")}
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleInstall}
            isLoading={isPending}
            disabled={isLoading}
          >
            {t("tools.marketplace.installButton")}
          </Button>
        </div>
      </Container>
    </div>
  );
};
