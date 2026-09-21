import {
  Badge,
  Button,
  Container,
  Divider,
  Heading,
  StatusBadge,
  Text,
  toast,
  usePrompt,
} from "@medusajs/ui";
import { PencilSquare, Trash } from "@medusajs/icons";
import type { ToolResponseDto } from "@repo/client";
import { useDeleteTool, useReauth, useToolLogo } from "@/hooks/api/tools";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ActionMenu } from "@repo/ui/common-components";
import { TOOL_STATUS_COLOR } from "../../constants";
import { ToolLogo } from "../../components/tool-logo";

const PENDING_RETURN_TO_KEY = "composio-return-to";

type ToolGeneralSectionProps = {
  item: ToolResponseDto;
};

export const ToolGeneralSection = ({ item }: ToolGeneralSectionProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const prompt = usePrompt();
  const { workspaceSlug } = useWorkspaceParams();
  const { deleteTool, isPending: isDeleting } = useDeleteTool(workspaceSlug);
  const { reauth, isPending: isRetrying } = useReauth(workspaceSlug);
  const { logo, isLoading: isLogoLoading } = useToolLogo(workspaceSlug, item);

  const statusColor = TOOL_STATUS_COLOR[item.status] ?? "grey";
  const statusLabel = t(
    `tools.list.filters.statusOptions.${item.status.toLowerCase().replace(/_/g, "")}`,
  );

  type HttpError = { response?: { status?: number }; status?: number };
  const httpStatus = (err: unknown) =>
    (err as HttpError)?.response?.status ?? (err as HttpError)?.status;
  const isNotFound = (err: unknown) => httpStatus(err) === 404;

  const handleDelete = async () => {
    const confirmed = await prompt({
      title: t("tools.delete.confirm.title"),
      description: t("tools.delete.confirm.description"),
      variant: "danger",
      confirmText: t("tools.delete.confirm.confirmButton"),
      cancelText: t("actions.cancel"),
    });
    if (!confirmed) return;

    try {
      await deleteTool(item.id);
      toast.success(t("tools.delete.success"));
      navigate(`/${workspaceSlug}/tools`);
    } catch (err) {
      if (isNotFound(err)) {
        navigate(`/${workspaceSlug}/tools`);
        return;
      }
      if (httpStatus(err) === 409) {
        toast.error(t("tools.delete.errorReferenced"));
      } else {
        toast.error(t("tools.delete.error"));
      }
    }
  };

  const handleRetryAuth = async () => {
    try {
      const callbackUrl = `${window.location.origin}/${workspaceSlug}/tools/marketplace/callback`;
      const res = await reauth({ toolId: item.id, callbackUrl });
      const data = (res?.data as { data?: { redirectUrl?: string } })?.data;
      const redirectUrl = data?.redirectUrl;
      if (!redirectUrl) {
        // No-auth toolkit: install completed inline
        toast.success(t("tools.marketplace.installSuccessToast"));
        return;
      }
      // Store return-to for post-OAuth navigation
      // sessionId is already embedded in callbackUrl by the backend (?sessionId=...)
      sessionStorage.setItem(PENDING_RETURN_TO_KEY, window.location.href);
      window.location.href = redirectUrl;
    } catch {
      toast.error(t("tools.marketplace.installErrorToast"));
    }
  };

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-x-3">
          {/* Only real toolkit logos get an avatar — no initials
              placeholder for HTTP tools / custom MCP tools with no
              resolvable toolkit. */}
          {(isLogoLoading || logo) && (
            <ToolLogo
              name={item.displayName}
              logo={logo}
              isLoading={isLogoLoading}
              size="large"
            />
          )}
          <div className="flex flex-col gap-y-1">
            <div className="flex items-center gap-x-2">
              <Heading level="h2">{item.displayName}</Heading>
              <Badge
                size="2xsmall"
                color={item.kind === "HTTP" ? "blue" : "purple"}
              >
                {t(`tools.list.filters.kindOptions.${item.kind}`, {
                  defaultValue: item.kind,
                })}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-x-2">
          <StatusBadge color={statusColor}>{statusLabel}</StatusBadge>
          <ActionMenu
            groups={[
              {
                actions: [
                  {
                    icon: <PencilSquare />,
                    label: t("actions.edit"),
                    onClick: () =>
                      navigate(`/${workspaceSlug}/tools/${item.id}/edit`),
                  },
                ],
              },
              {
                actions: [
                  {
                    icon: <Trash />,
                    label: t("actions.delete"),
                    onClick: handleDelete,
                    disabled: isDeleting,
                  },
                ],
              },
            ]}
          />
        </div>
      </div>
      {item.status === "NEEDS_REAUTH" && (
        <>
          <div className="flex items-center justify-between px-6 py-3">
            <Text size="small" className="text-ui-fg-subtle">
              {t("tools.pendingAuth.hint")}
            </Text>
            <div className="flex items-center gap-x-2">
              <Button
                variant="secondary"
                size="small"
                onClick={handleDelete}
                disabled={isRetrying || isDeleting}
              >
                {t("tools.pendingAuth.discardButton")}
              </Button>
              <Button
                variant="primary"
                size="small"
                onClick={handleRetryAuth}
                isLoading={isRetrying}
                disabled={isDeleting}
              >
                {t("tools.pendingAuth.retryButton")}
              </Button>
            </div>
          </div>
        </>
      )}
    </Container>
  );
};
