import { RouteDrawer } from "@/components/modals";
import { useGetTool, useUpdateTool } from "@/hooks/api/tools";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { zodV4Resolver } from "@repo/ui/utils";
import { Button, Heading, Input, Textarea, Text, toast } from "@medusajs/ui";
import { Form } from "@repo/ui/common-components";
import { Helmet } from "react-helmet-async";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import * as z from "zod/v4";
import { HttpToolForm } from "../components/http-tool-form";
import { toUpdateHttpPayload } from "../components/http-tool-payload";
import { schemaToRows } from "../components/json-schema-editor";
import type { HttpToolFormData } from "../components/http-tool-schema";

const mcpEditSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().min(1),
});
type McpEditFormData = z.infer<typeof mcpEditSchema>;

const ToolEditInner = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { workspaceSlug } = useWorkspaceParams();
  const { toolId } = useParams<{ toolId: string }>();

  const { tool, isLoading } = useGetTool(workspaceSlug, toolId ?? "", {
    enabled: !!toolId,
  });
  const { updateTool, isPending: isUpdating } = useUpdateTool(
    workspaceSlug,
    toolId ?? "",
  );
  const [submitError, setSubmitError] = useState<string | null>(null);

  const defaultValues = useMemo<Partial<HttpToolFormData>>(() => {
    if (!tool) return {};
    const loadedSchema = tool.httpInputSchema as
      Record<string, unknown> | undefined;
    const decomposedRows = loadedSchema ? schemaToRows(loadedSchema) : [];
    return {
      name: tool.name,
      description: tool.description,
      httpMethod: (tool.httpMethod as HttpToolFormData["httpMethod"]) ?? "GET",
      httpUrl: tool.httpUrl ?? "",
      // schemaToRows returns null for schemas the structured editor cannot
      // represent (nested objects, oneOf, …). Fall back to empty rows; the
      // JSON-mode editor still lets the user see/edit the raw schema.
      inputSchemaRows: decomposedRows ?? [],
      headers: undefined,
      auth: { type: "none" },
      credential: "",
      timeoutMs: tool.timeoutMs,
      maxRetries: tool.maxRetries,
    };
  }, [tool]);

  const handleSubmit = async (data: HttpToolFormData) => {
    setSubmitError(null);
    try {
      const payload = toUpdateHttpPayload(data);
      await updateTool(payload);
      toast.success(t("tools.edit.success"));
      // Drawer stays open on save; user closes manually when done.
      navigate("..");
    } catch (error) {
      console.error("Error updating tool:", error);
      const message =
        (error as A)?.body?.message ??
        (error as A)?.message ??
        t("tools.errors.updateFailed");
      setSubmitError(message);
      toast.error(message);
    }
  };

  const handleCancel = () => navigate(`/${workspaceSlug}/tools/${toolId}`);

  if (isLoading || !tool) {
    return (
      <>
        <RouteDrawer.Header>
          <RouteDrawer.Title asChild>
            <Heading level="h2">{t("tools.edit.title")}</Heading>
          </RouteDrawer.Title>
          <RouteDrawer.Description className="sr-only">
            {t("tools.edit.subtitle")}
          </RouteDrawer.Description>
        </RouteDrawer.Header>
        <RouteDrawer.Body className="p-6">
          <Text size="small" className="text-ui-fg-subtle">
            {t("tools.list.loading")}
          </Text>
        </RouteDrawer.Body>
      </>
    );
  }

  if (tool.kind === "MCP") {
    return (
      <McpToolEditForm
        tool={tool}
        onCancel={handleCancel}
        onUpdate={updateTool}
        isUpdating={isUpdating}
      />
    );
  }

  return (
    <>
      <Helmet>
        <title>
          {tool.name} · {t("tools.edit.title")} - Ecbot
        </title>
      </Helmet>
      <RouteDrawer.Header>
        <RouteDrawer.Title asChild>
          <Heading level="h2">{tool.name}</Heading>
        </RouteDrawer.Title>
        <RouteDrawer.Description asChild>
          <Text size="small" className="text-ui-fg-subtle">
            {t("tools.edit.subtitle")}
          </Text>
        </RouteDrawer.Description>
      </RouteDrawer.Header>
      <RouteDrawer.Body className="flex flex-1 flex-col gap-y-6 overflow-y-auto p-6">
        <HttpToolForm
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel={t("tools.edit.submit")}
          isSubmitting={isUpdating}
          submitError={submitError}
        />
      </RouteDrawer.Body>
    </>
  );
};

type McpToolEditFormProps = {
  tool: { id: string; name: string; description?: string };
  onCancel: () => void;
  onUpdate: (payload: Record<string, unknown>) => Promise<unknown>;
  isUpdating: boolean;
};

function McpToolEditForm({
  tool,
  onCancel,
  onUpdate,
  isUpdating,
}: McpToolEditFormProps) {
  const { t } = useTranslation();
  const form = useForm<McpEditFormData>({
    resolver: zodV4Resolver(mcpEditSchema),
    defaultValues: { name: tool.name, description: tool.description ?? "" },
  });

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      await onUpdate(data);
      toast.success(t("tools.edit.success"));
      onCancel();
    } catch (error) {
      toast.error((error as A)?.body?.message ?? t("tools.edit.error"));
    }
  });

  return (
    <>
      <RouteDrawer.Header>
        <RouteDrawer.Title asChild>
          <Heading level="h2">{tool.name}</Heading>
        </RouteDrawer.Title>
        <RouteDrawer.Description className="sr-only">
          {t("tools.edit.subtitle")}
        </RouteDrawer.Description>
      </RouteDrawer.Header>
      <RouteDrawer.Form form={form}>
        <RouteDrawer.Body className="flex flex-col gap-y-6 p-6">
          <Form.Field
            control={form.control}
            name="name"
            render={({ field }) => (
              <Form.Item>
                <Form.Label>{t("tools.form.name")}</Form.Label>
                <Form.Control>
                  <Input {...field} />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
          <Form.Field
            control={form.control}
            name="description"
            render={({ field }) => (
              <Form.Item>
                <Form.Label>{t("tools.form.description")}</Form.Label>
                <Form.Control>
                  <Textarea {...field} rows={4} />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
        </RouteDrawer.Body>
        <RouteDrawer.Footer>
          <div className="flex items-center gap-2 ml-auto">
            <Button type="button" variant="secondary" onClick={onCancel}>
              {t("actions.cancel")}
            </Button>
            <Button
              type="submit"
              onClick={handleSubmit}
              isLoading={isUpdating}
              disabled={isUpdating}
            >
              {t("tools.edit.submit")}
            </Button>
          </div>
        </RouteDrawer.Footer>
      </RouteDrawer.Form>
    </>
  );
}

export const ToolEdit = () => {
  const { workspaceSlug } = useWorkspaceParams();
  const { toolId } = useParams<{ toolId: string }>();
  return (
    <RouteDrawer prev={`/${workspaceSlug}/tools/${toolId}`}>
      <ToolEditInner />
    </RouteDrawer>
  );
};
