import { useCreateMcpTool } from "@/hooks/api/tools";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { toast } from "@medusajs/ui";
import type { ToolResponseDto } from "@repo/client";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { McpToolForm } from "../../components/mcp-tool-form";
import { toCreateMcpPayload } from "../../components/mcp-tool-payload";
import type { McpToolFormData } from "../../components/mcp-tool-schema";

type McpCreateStepProps = {
  onSuccess: (toolId?: string) => void;
  onCancel: () => void;
  onPendingChange: (pending: boolean) => void;
};

export const McpCreateStep = ({
  onSuccess,
  onCancel,
  onPendingChange,
}: McpCreateStepProps) => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const { createMcpTool, isPending } = useCreateMcpTool(workspaceSlug);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    onPendingChange(isPending);
  }, [isPending, onPendingChange]);

  const handleSubmit = async (data: McpToolFormData) => {
    setSubmitError(null);
    try {
      const payload = toCreateMcpPayload(data);
      const res = await createMcpTool(payload);
      const created = res?.data?.data as ToolResponseDto | undefined;
      toast.success(t("tools.mcp.create.success"));
      onSuccess(created?.id);
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

  return (
    <McpToolForm
      id="unified-create-mcp-tool"
      hideActions
      defaultValues={{}}
      onSubmit={handleSubmit}
      onCancel={onCancel}
      submitLabel={t("tools.actions.create")}
      isSubmitting={isPending}
      submitError={submitError}
    />
  );
};
