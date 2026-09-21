import { RouteFocusModal, useRouteModal } from "@/components/modals";
import { useCreateMcpTool } from "@/hooks/api/tools";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { Button, toast } from "@medusajs/ui";
import type { ToolResponseDto } from "@repo/client";
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { McpToolForm } from "../components/mcp-tool-form";
import { toCreateMcpPayload } from "../components/mcp-tool-payload";
import type { McpToolFormData } from "../components/mcp-tool-schema";

const ToolNewMcpInner = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { workspaceSlug } = useWorkspaceParams();
  const { handleSuccess } = useRouteModal();

  const { createMcpTool, isPending } = useCreateMcpTool(workspaceSlug);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (data: McpToolFormData) => {
    setSubmitError(null);
    try {
      const payload = toCreateMcpPayload(data);
      const res = await createMcpTool(payload);
      const created = (res?.data as A)?.data as ToolResponseDto | undefined;
      toast.success(t("tools.mcp.create.success"));
      if (created?.id) {
        handleSuccess(`/${workspaceSlug}/tools/${created.id}`);
      } else {
        handleSuccess();
      }
    } catch (error) {
      console.error("Error creating MCP tool:", error);
      const message =
        (error as A)?.body?.message ??
        (error as A)?.message ??
        t("tools.errors.createFailed");
      setSubmitError(message);
      toast.error(message);
    }
  };

  const handleCancel = () => navigate(`/${workspaceSlug}/tools`);

  return (
    <>
      <Helmet>
        <title>{t("tools.mcp.create.title")} - Ecbot</title>
      </Helmet>
      <RouteFocusModal.Header>
        <RouteFocusModal.Title asChild>
          <span className="sr-only">{t("tools.mcp.create.title")}</span>
        </RouteFocusModal.Title>
        <RouteFocusModal.Description asChild>
          <span className="sr-only">{t("tools.mcp.create.subtitle")}</span>
        </RouteFocusModal.Description>
        <div className="flex items-center justify-end gap-x-2">
          <Button type="button" variant="secondary" onClick={handleCancel}>
            {t("actions.cancel")}
          </Button>
          <Button
            type="submit"
            form="create-mcp-tool"
            disabled={isPending}
            isLoading={isPending}
          >
            {t("tools.actions.create")}
          </Button>
        </div>
      </RouteFocusModal.Header>
      <RouteFocusModal.Body className="flex flex-col items-center overflow-y-auto p-16">
        <McpToolForm
          id="create-mcp-tool"
          hideActions
          defaultValues={{}}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel={t("tools.actions.create")}
          isSubmitting={isPending}
          submitError={submitError}
        />
      </RouteFocusModal.Body>
    </>
  );
};

export const ToolNewMcp = () => {
  const { workspaceSlug } = useWorkspaceParams();
  return (
    <RouteFocusModal prev={`/${workspaceSlug}/tools`}>
      <ToolNewMcpInner />
    </RouteFocusModal>
  );
};
