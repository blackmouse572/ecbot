import { RouteFocusModal, useRouteModal } from "@/components/modals";
import {
  useCreateHttpTool,
  useTestInlineTool,
  type ToolTestResult,
} from "@/hooks/api/tools";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { Button, toast } from "@medusajs/ui";
import type { ToolResponseDto } from "@repo/client";
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { HttpToolForm } from "../components/http-tool-form";
import { toCreateHttpPayload } from "../components/http-tool-payload";
import type { HttpToolFormData } from "../components/http-tool-schema";

const ToolNewHttpInner = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { workspaceSlug } = useWorkspaceParams();
  const { handleSuccess } = useRouteModal();

  const { createHttpTool, isPending } = useCreateHttpTool(workspaceSlug);
  const { testTool } = useTestInlineTool(workspaceSlug);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (data: HttpToolFormData) => {
    setSubmitError(null);
    try {
      const payload = toCreateHttpPayload(data);
      const res = await createHttpTool(payload);
      const created = (res?.data as A)?.data as ToolResponseDto | undefined;
      toast.success(t("tools.create.success"));
      if (created?.id) {
        // Go straight to the edit drawer for the new tool.
        handleSuccess(`/${workspaceSlug}/tools/${created.id}`);
      } else {
        handleSuccess();
      }
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

  const handleCancel = () => navigate(`/${workspaceSlug}/tools`);

  return (
    <>
      <Helmet>
        <title>{t("tools.create.title")} - Ecbot</title>
      </Helmet>
      <RouteFocusModal.Header>
        <RouteFocusModal.Title asChild>
          <span className="sr-only">{t("tools.create.title")}</span>
        </RouteFocusModal.Title>
        <RouteFocusModal.Description asChild>
          <span className="sr-only">{t("tools.create.subtitle")}</span>
        </RouteFocusModal.Description>
        <div className="flex items-center justify-end gap-x-2">
          <Button type="button" variant="secondary" onClick={handleCancel}>
            {t("actions.cancel")}
          </Button>
          <Button
            type="submit"
            form="create-http-tool"
            disabled={isPending}
            isLoading={isPending}
          >
            {t("tools.actions.create")}
          </Button>
        </div>
      </RouteFocusModal.Header>
      <RouteFocusModal.Body className="flex flex-col items-center overflow-y-auto p-16">
        <HttpToolForm
          id="create-http-tool"
          hideActions
          defaultValues={{}}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          onTest={handleTest}
          submitLabel={t("tools.actions.create")}
          isSubmitting={isPending}
          submitError={submitError}
        />
      </RouteFocusModal.Body>
    </>
  );
};

export const ToolNewHttp = () => {
  const { workspaceSlug } = useWorkspaceParams();
  return (
    <RouteFocusModal prev={`/${workspaceSlug}/tools`}>
      <ToolNewHttpInner />
    </RouteFocusModal>
  );
};
