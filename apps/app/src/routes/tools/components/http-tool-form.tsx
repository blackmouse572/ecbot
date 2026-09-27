import { Badge, Button, Input, Select, Textarea } from "@medusajs/ui";
import { Form } from "@repo/ui/common-components";
import { useState, type FC, type ReactNode } from "react";
import type { ToolTestResult } from "@/hooks/api/tools";
import { useForm, type FieldPath } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { zodResolver } from "@hookform/resolvers/zod";
import { HeadersEditor, type HeadersEditorMode } from "./headers-editor";
import {
  JsonSchemaEditor,
  type JsonSchemaEditorMode,
  type SchemaProp,
} from "./json-schema-editor";
import {
  AUTH_PLACEMENTS,
  AUTH_TYPES,
  createHttpToolSchema,
  HTTP_METHODS,
  httpToolTestSchema,
  type HttpToolFormData,
  type HttpToolFormInput,
} from "./http-tool-schema";

export type HttpToolFormProps = {
  defaultValues: Partial<HttpToolFormData>;
  onSubmit: (data: HttpToolFormData) => Promise<void> | void;
  onCancel?: () => void;
  onTest?: (
    formData: HttpToolFormData,
    args: Record<string, unknown>,
  ) => Promise<ToolTestResult>;
  submitLabel: string;
  isSubmitting?: boolean;
  submitError?: string | null;
  trailingActions?: ReactNode;
  id?: string;
  hideActions?: boolean;
};

// Everything an execution needs: the schema's own keys minus the metadata.
// Derived rather than listed so a new field can't be forgotten here.
const HTTP_REQUEST_FIELDS = Object.keys(createHttpToolSchema.shape).filter(
  (key) => key !== "name" && key !== "description",
) as FieldPath<HttpToolFormInput>[];

const DEFAULT_VALUES: HttpToolFormData = {
  name: "",
  description: "",
  httpMethod: "GET",
  httpUrl: "",
  inputSchemaRows: [],
  headers: undefined,
  auth: { type: "none" },
  credential: "",
  timeoutMs: undefined,
  maxRetries: undefined,
};

export const HttpToolForm: FC<HttpToolFormProps> = ({
  defaultValues,
  onSubmit,
  onCancel,
  onTest,
  submitLabel,
  isSubmitting,
  submitError,
  trailingActions,
  id,
  hideActions,
}) => {
  const { t } = useTranslation();

  // Three generics because the schema coerces: `timeoutMs`/`maxRetries` are
  // `unknown` going in and `number` coming out, so the field values and the
  // submitted payload are different types.
  const form = useForm<HttpToolFormInput, unknown, HttpToolFormData>({
    resolver: zodResolver(createHttpToolSchema),
    defaultValues: { ...DEFAULT_VALUES, ...defaultValues },
  });

  const [schemaMode, setSchemaMode] =
    useState<JsonSchemaEditorMode>("structured");
  const [headersMode, setHeadersMode] =
    useState<HeadersEditorMode>("structured");

  // Test panel state
  // `trigger()` does not set `isSubmitted`, so the row editors need their own
  // signal to start showing per-row errors after a test attempt.
  const [testAttempted, setTestAttempted] = useState(false);
  const [testArgsText, setTestArgsText] = useState("{}");
  const [testArgsError, setTestArgsError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<ToolTestResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const handleSubmit = form.handleSubmit(
    async (data) => {
      await onSubmit(data);
    },
    (errors) => console.error("HttpToolForm validation errors", errors),
  );

  const handleTest = async () => {
    if (!onTest) return;
    setTestArgsError(null);
    let parsedArgs: Record<string, unknown>;
    try {
      parsedArgs = JSON.parse(testArgsText) as Record<string, unknown>;
    } catch {
      setTestArgsError(t("tools.test.invalidJson"));
      return;
    }
    // getValues() yields the raw input type, so the config has to be parsed
    // into the same coerced payload a submit would send. `httpToolTestSchema`
    // relaxes name/description — an unnamed draft is still testable.
    setTestAttempted(true);
    const config = httpToolTestSchema.safeParse(form.getValues());
    if (!config.success) {
      // Surface the offending fields inline rather than failing silently —
      // scoped to the request, so a blank name doesn't light up too.
      await form.trigger(HTTP_REQUEST_FIELDS);
      return;
    }

    setIsTesting(true);
    try {
      const result = await onTest(config.data, parsedArgs);
      setTestResult(result);
    } catch (err) {
      const msg =
        (err as A)?.body?.message ?? (err as A)?.message ?? "Unknown error";
      setTestResult({
        status: "ERROR",
        errorMessage: msg,
        durationMs: 0,
      });
    } finally {
      setIsTesting(false);
    }
  };

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
                  placeholder={t("tools.form.namePlaceholder")}
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

        <div className="grid grid-cols-3 gap-4">
          <Form.Field
            control={form.control}
            name="httpMethod"
            render={({ field }) => (
              <Form.Item>
                <Form.Label>{t("tools.form.httpMethod")}</Form.Label>
                <Form.Control>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <Select.Trigger>
                      <Select.Value />
                    </Select.Trigger>
                    <Select.Content>
                      {HTTP_METHODS.map((method) => (
                        <Select.Item key={method} value={method}>
                          {method}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
          <div className="col-span-2">
            <Form.Field
              control={form.control}
              name="httpUrl"
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>{t("tools.form.httpUrl")}</Form.Label>
                  <Form.Control>
                    <Input
                      {...field}
                      placeholder="https://api.example.com/v1/search"
                    />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
          </div>
        </div>

        <Form.Field
          control={form.control}
          name="inputSchemaRows"
          render={({ field }) => (
            <Form.Item>
              <Form.Label>{t("tools.form.inputSchema")}</Form.Label>
              <Form.Hint>{t("tools.form.inputSchemaHint")}</Form.Hint>
              <JsonSchemaEditor
                rows={(field.value as SchemaProp[]) ?? []}
                onRowsChange={field.onChange}
                mode={schemaMode}
                onModeChange={setSchemaMode}
                showErrors={form.formState.isSubmitted || testAttempted}
              />
              <Form.ErrorMessage />
            </Form.Item>
          )}
        />

        <Form.Field
          control={form.control}
          name="headers"
          render={({ field }) => (
            <Form.Item>
              <Form.Label optional>{t("tools.form.headers")}</Form.Label>
              <Form.Hint>{t("tools.form.headersHint")}</Form.Hint>
              <HeadersEditor
                value={field.value as Record<string, string> | undefined}
                onChange={field.onChange}
                mode={headersMode}
                onModeChange={setHeadersMode}
                showErrors={form.formState.isSubmitted || testAttempted}
              />
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
                      {AUTH_TYPES.map((type) => (
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
                        {AUTH_PLACEMENTS.map((p) => (
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

        <div className="grid grid-cols-2 gap-4">
          <Form.Field
            control={form.control}
            name="timeoutMs"
            render={({ field }) => (
              <Form.Item>
                <Form.Label optional>{t("tools.form.timeoutMs")}</Form.Label>
                <Form.Control>
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    type="number"
                    min={1}
                    placeholder="30000"
                  />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
          <Form.Field
            control={form.control}
            name="maxRetries"
            render={({ field }) => (
              <Form.Item>
                <Form.Label optional>{t("tools.form.maxRetries")}</Form.Label>
                <Form.Control>
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    type="number"
                    min={0}
                    max={3}
                    placeholder="0"
                  />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
        </div>

        {onTest && (
          <div className="flex flex-col gap-y-3 rounded-md border border-ui-border-base bg-ui-bg-subtle p-4">
            <p className="txt-compact-small font-medium text-ui-fg-base">
              {t("tools.test.title")}
            </p>
            <div className="flex flex-col gap-y-1">
              <label className="txt-compact-small text-ui-fg-subtle">
                {t("tools.test.argsLabel")}
              </label>
              <Textarea
                value={testArgsText}
                onChange={(e) => {
                  setTestArgsText(e.target.value);
                  setTestArgsError(null);
                }}
                rows={4}
                className="font-mono text-xs"
                placeholder="{}"
              />
              {testArgsError && (
                <span className="txt-compact-xsmall text-ui-fg-error">
                  {testArgsError}
                </span>
              )}
            </div>
            <div>
              <Button
                size="small"
                variant="secondary"
                type="button"
                onClick={handleTest}
                disabled={isTesting}
                isLoading={isTesting}
              >
                {t("tools.test.runButton")}
              </Button>
            </div>
            {testResult && (
              <div className="rounded-md border border-ui-border-base bg-ui-bg-base p-3 flex flex-col gap-y-2">
                <div className="flex items-center gap-x-2">
                  <Badge
                    color={
                      testResult.status === "SUCCESS"
                        ? "green"
                        : testResult.status === "TIMEOUT"
                          ? "orange"
                          : "red"
                    }
                    size="xsmall"
                  >
                    {testResult.status === "SUCCESS"
                      ? t("tools.test.result.success")
                      : testResult.status === "TIMEOUT"
                        ? t("tools.test.result.timeout")
                        : t("tools.test.result.error")}
                  </Badge>
                  <span className="txt-compact-xsmall text-ui-fg-muted">
                    {t("tools.test.result.duration", {
                      ms: testResult.durationMs,
                    })}
                  </span>
                </div>
                {testResult.result !== undefined && (
                  <pre className="text-xs font-mono whitespace-pre-wrap break-all text-ui-fg-base overflow-auto max-h-64">
                    {typeof testResult.result === "string"
                      ? testResult.result
                      : JSON.stringify(testResult.result, null, 2)}
                  </pre>
                )}
                {testResult.errorMessage && (
                  <pre className="text-xs font-mono whitespace-pre-wrap break-all text-ui-fg-error overflow-auto max-h-64">
                    {testResult.errorMessage}
                  </pre>
                )}
              </div>
            )}
          </div>
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
