import { Button, Input, Select, Textarea } from "@medusajs/ui";
import { Form } from "@repo/ui/common-components";
import type { FC, ReactNode } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { zodV4Resolver } from "@repo/ui/utils";
import {
  MCP_AUTH_PLACEMENTS,
  MCP_AUTH_TYPES,
  createMcpToolSchema,
  type McpToolFormData,
} from "./mcp-tool-schema";

export type McpToolFormProps = {
  defaultValues: Partial<McpToolFormData>;
  onSubmit: (data: McpToolFormData) => Promise<void> | void;
  onCancel?: () => void;
  submitLabel: string;
  isSubmitting?: boolean;
  submitError?: string | null;
  trailingActions?: ReactNode;
  id?: string;
  hideActions?: boolean;
};

const DEFAULT_VALUES: McpToolFormData = {
  name: "",
  description: "",
  serverUrl: "",
  auth: { type: "none" },
  credential: "",
};

export const McpToolForm: FC<McpToolFormProps> = ({
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel,
  isSubmitting,
  submitError,
  trailingActions,
  id,
  hideActions,
}) => {
  const { t } = useTranslation();

  const form = useForm<McpToolFormData>({
    resolver: zodV4Resolver<typeof createMcpToolSchema, McpToolFormData>(
      createMcpToolSchema,
    ),
    defaultValues: { ...DEFAULT_VALUES, ...defaultValues },
  });

  const handleSubmit = form.handleSubmit(
    async (data) => {
      await onSubmit(data);
    },
    (errors) => console.error("McpToolForm validation errors", errors),
  );

  const authType = form.watch("auth.type");
  const showApiKeyFields = authType === "api_key";
  const showCredential = authType && authType !== "none";

  return (
    <Form {...form}>
      <form
        id={id}
        onSubmit={handleSubmit}
        className="flex flex-col gap-y-6 w-full max-w-[720px]"
      >
        <Form.Field
          control={form.control}
          name="name"
          render={({ field }) => (
            <Form.Item>
              <Form.Label>{t("tools.form.name")}</Form.Label>
              <Form.Control>
                <Input
                  {...field}
                  placeholder={t("tools.mcp.form.namePlaceholder")}
                />
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
                <Textarea
                  {...field}
                  rows={3}
                  placeholder={t("tools.form.descriptionPlaceholder")}
                />
              </Form.Control>
              <Form.ErrorMessage />
            </Form.Item>
          )}
        />

        <Form.Field
          control={form.control}
          name="serverUrl"
          render={({ field }) => (
            <Form.Item>
              <Form.Label>{t("tools.mcp.form.serverUrl")}</Form.Label>
              <Form.Hint>{t("tools.mcp.form.serverUrlHint")}</Form.Hint>
              <Form.Control>
                <Input {...field} placeholder="https://mcp.example.com/sse" />
              </Form.Control>
              <Form.ErrorMessage />
            </Form.Item>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <Form.Field
            control={form.control}
            name="auth.type"
            render={({ field }) => (
              <Form.Item>
                <Form.Label>{t("tools.form.authType")}</Form.Label>
                <Form.Control>
                  <Select
                    value={field.value ?? "none"}
                    onValueChange={field.onChange}
                  >
                    <Select.Trigger>
                      <Select.Value />
                    </Select.Trigger>
                    <Select.Content>
                      {MCP_AUTH_TYPES.map((type) => (
                        <Select.Item key={type} value={type}>
                          {t(`tools.form.authTypeOptions.${type}`)}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />

          {showApiKeyFields && (
            <Form.Field
              control={form.control}
              name="auth.placement"
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>{t("tools.form.authPlacement")}</Form.Label>
                  <Form.Control>
                    <Select
                      value={field.value ?? "header"}
                      onValueChange={field.onChange}
                    >
                      <Select.Trigger>
                        <Select.Value />
                      </Select.Trigger>
                      <Select.Content>
                        {MCP_AUTH_PLACEMENTS.map((p) => (
                          <Select.Item key={p} value={p}>
                            {t(`tools.form.authPlacementOptions.${p}`)}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select>
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
          )}
        </div>

        {showApiKeyFields && (
          <Form.Field
            control={form.control}
            name="auth.paramName"
            render={({ field }) => (
              <Form.Item>
                <Form.Label>{t("tools.form.authParamName")}</Form.Label>
                <Form.Hint>{t("tools.form.authParamNameHint")}</Form.Hint>
                <Form.Control>
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    placeholder="X-API-Key"
                  />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
        )}

        {showCredential && (
          <Form.Field
            control={form.control}
            name="credential"
            render={({ field }) => (
              <Form.Item>
                <Form.Label optional>{t("tools.form.credential")}</Form.Label>
                <Form.Hint>{t("tools.form.credentialHint")}</Form.Hint>
                <Form.Control>
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    type="password"
                    autoComplete="off"
                    placeholder={t("tools.form.credentialPlaceholder")}
                  />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
        )}

        {submitError && (
          <div className="rounded-md border border-ui-border-error bg-ui-bg-subtle px-3 py-2 text-ui-fg-error txt-compact-small">
            {submitError}
          </div>
        )}

        {!hideActions && (
          <div className="flex items-center justify-between gap-x-2 pt-2">
            <div>{trailingActions}</div>
            <div className="flex items-center gap-x-2">
              {onCancel && (
                <Button type="button" variant="secondary" onClick={onCancel}>
                  {t("actions.cancel")}
                </Button>
              )}
              <Button
                type="submit"
                disabled={isSubmitting}
                isLoading={isSubmitting}
              >
                {submitLabel}
              </Button>
            </div>
          </div>
        )}
      </form>
    </Form>
  );
};
