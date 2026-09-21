import { RouteFocusModal, useRouteModal } from "@/components/modals";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { Button } from "@medusajs/ui";
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { HttpCreateStep } from "./components/http-create-step";
import { MarketplaceBrowseStep } from "./components/marketplace-browse-step";
import { McpCreateStep } from "./components/mcp-create-step";
import { SuccessStep } from "./components/success-step";
import { ToolTypePicker, type ToolType } from "./components/tool-type-picker";

type Step =
  | { id: "picker" }
  | { id: "http" }
  | { id: "mcp" }
  | { id: "marketplace" }
  | { id: "success"; toolId?: string };

const ToolNewInner = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { workspaceSlug } = useWorkspaceParams();
  const { handleSuccess } = useRouteModal();

  const [step, setStep] = useState<Step>({ id: "picker" });

  // Submission loading state — lifted up so the header can show it.
  const [isPending, setIsPending] = useState(false);
  // The form id that the header submit button should target.
  const [formId, setFormId] = useState<string | undefined>(undefined);

  const handleCancel = () => navigate(`/${workspaceSlug}/tools`);
  const handleBack = () => setStep({ id: "picker" });

  const handleTypeSelect = (type: ToolType) => {
    if (type === "http") setFormId("unified-create-http-tool");
    else if (type === "mcp") setFormId("unified-create-mcp-tool");
    else setFormId(undefined);
    setStep({ id: type });
  };

  const handleCreated = (toolId?: string) => {
    setFormId(undefined);
    setIsPending(false);
    setStep({ id: "success", toolId });
  };

  const handleGoToTool = () => {
    const toolId = step.id === "success" ? step.toolId : undefined;
    if (toolId) {
      handleSuccess(`/${workspaceSlug}/tools/${toolId}`);
    } else {
      handleSuccess();
    }
  };

  const handleClose = () => handleSuccess();

  const headerTitle =
    step.id === "http"
      ? t("tools.new.http.title")
      : step.id === "mcp"
        ? t("tools.new.mcp.title")
        : step.id === "marketplace"
          ? t("tools.marketplace.title")
          : step.id === "success"
            ? t("tools.new.success.title")
            : t("tools.new.picker.title");

  const headerDescription =
    step.id === "picker" ? t("tools.new.picker.subtitle") : "";

  const renderHeaderActions = () => {
    if (step.id === "picker") {
      return (
        <Button type="button" variant="secondary" onClick={handleCancel}>
          {t("actions.cancel")}
        </Button>
      );
    }

    if (step.id === "http" || step.id === "mcp") {
      return (
        <>
          <Button type="button" variant="secondary" onClick={handleBack}>
            {t("actions.back")}
          </Button>
          <Button type="button" variant="secondary" onClick={handleCancel}>
            {t("actions.cancel")}
          </Button>
          {formId && (
            <Button
              type="submit"
              form={formId}
              disabled={isPending}
              isLoading={isPending}
            >
              {t("tools.actions.create")}
            </Button>
          )}
        </>
      );
    }

    if (step.id === "marketplace") {
      // Marketplace step manages its own actions (detail view has install button)
      return null;
    }

    if (step.id === "success") {
      return (
        <>
          <Button type="button" variant="secondary" onClick={handleClose}>
            {t("actions.close")}
          </Button>
          {step.toolId && (
            <Button type="button" variant="primary" onClick={handleGoToTool}>
              {t("tools.new.success.goToTool")}
            </Button>
          )}
        </>
      );
    }

    return null;
  };

  return (
    <>
      <Helmet>
        <title>{headerTitle} - Ecbot</title>
      </Helmet>
      <RouteFocusModal.Header>
        <RouteFocusModal.Title asChild>
          <span className="sr-only">{headerTitle}</span>
        </RouteFocusModal.Title>
        <RouteFocusModal.Description asChild>
          <span className="sr-only">{headerDescription}</span>
        </RouteFocusModal.Description>
        <div className="flex items-center justify-end gap-x-2">
          {renderHeaderActions()}
        </div>
      </RouteFocusModal.Header>

      {step.id === "picker" && (
        <RouteFocusModal.Body className="flex flex-col items-center overflow-y-auto p-16">
          <ToolTypePicker onSelect={handleTypeSelect} />
        </RouteFocusModal.Body>
      )}

      {step.id === "http" && (
        <RouteFocusModal.Body className="flex flex-col items-center overflow-y-auto p-16">
          <HttpCreateStep
            onSuccess={handleCreated}
            onCancel={handleCancel}
            onPendingChange={setIsPending}
          />
        </RouteFocusModal.Body>
      )}

      {step.id === "mcp" && (
        <RouteFocusModal.Body className="flex flex-col items-center overflow-y-auto p-16">
          <McpCreateStep
            onSuccess={handleCreated}
            onCancel={handleCancel}
            onPendingChange={setIsPending}
          />
        </RouteFocusModal.Body>
      )}

      {step.id === "marketplace" && (
        <RouteFocusModal.Body className="flex flex-col overflow-y-auto">
          <MarketplaceBrowseStep
            onBack={handleBack}
            onCancel={handleCancel}
            onInstalled={handleCreated}
          />
        </RouteFocusModal.Body>
      )}

      {step.id === "success" && (
        <RouteFocusModal.Body className="flex flex-col overflow-y-auto">
          <SuccessStep />
        </RouteFocusModal.Body>
      )}
    </>
  );
};

export const ToolNew = () => {
  const { workspaceSlug } = useWorkspaceParams();
  return (
    <RouteFocusModal prev={`/${workspaceSlug}/tools`}>
      <ToolNewInner />
    </RouteFocusModal>
  );
};
