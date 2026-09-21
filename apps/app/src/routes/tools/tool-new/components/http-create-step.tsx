import {
  useCreateHttpTool,
  useTestInlineTool,
  type ToolTestResult,
} from "@/hooks/api/tools";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { toast } from "@medusajs/ui";
import type { ToolResponseDto } from "@repo/client";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { HttpToolForm } from "../../components/http-tool-form";
import { toCreateHttpPayload } from "../../components/http-tool-payload";
import type { HttpToolFormData } from "../../components/http-tool-schema";

type HttpCreateStepProps = {
  onSuccess: (toolId?: string) => void;
  onCancel: () => void;
  onPendingChange: (pending: boolean) => void;
};

export const HttpCreateStep = ({
  onSuccess,
  onCancel,
  onPendingChange,
}: HttpCreateStepProps) => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const { createHttpTool, isPending } = useCreateHttpTool(workspaceSlug);
  const { testTool } = useTestInlineTool(workspaceSlug);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    onPendingChange(isPending);
  }, [isPending, onPendingChange]);

  const handleSubmit = async (data: HttpToolFormData) => {
    setSubmitError(null);
    try {
      const payload = toCreateHttpPayload(data);
      const res = await createHttpTool(payload);
      const created = res?.data?.data as ToolResponseDto | undefined;
      toast.success(t("tools.create.success"));
      onSuccess(created?.id);
    } catch (error) {
      console.error("Error creating HTTP tool:", error);
      const message =
        (error as A)?.body?.message ??
        (error as A)?.message ??
        t("tools.errors.createFailed");
      setSubmitError(message);
      toast.error(message);
    }
  };

  const handleTest = async (
    formData: HttpToolFormData,
    args: Record<string, unknown>,
  ): Promise<ToolTestResult> => {
    const payload = toCreateHttpPayload(formData);
    const res = await testTool({
      httpMethod: payload.httpMethod,
      httpUrl: payload.httpUrl,
      headers: payload.headers,
      auth: payload.auth,
      credential: payload.credential,
      timeoutMs: payload.timeoutMs,
      args,
    } as Record<string, unknown>);
    return (res?.data as A)?.data as ToolTestResult;
  };

  return (
    <HttpToolForm
      id="unified-create-http-tool"
      hideActions
      defaultValues={{}}
      onSubmit={handleSubmit}
      onCancel={onCancel}
      onTest={handleTest}
      submitLabel={t("tools.actions.create")}
      isSubmitting={isPending}
      submitError={submitError}
    />
  );
};
