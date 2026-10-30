import { Badge, Button, Container, Heading, Textarea } from "@medusajs/ui";
import { Section, SectionRow } from "@repo/ui/common-components";
import type { ToolResponseDto } from "@repo/client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { useTestSavedTool, type ToolTestResult } from "@/hooks/api/tools";
import { HttpRequestPreview } from "../../components/http-request-preview";
import { PathVariablesFields } from "../../components/path-variables-fields";
import { buildTestArgs } from "../../components/test-args";

type ToolEndpointSectionProps = {
  item: ToolResponseDto;
};

export const ToolEndpointSection = ({ item }: ToolEndpointSectionProps) => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const { testTool, isPending } = useTestSavedTool(workspaceSlug, item.id);

  const [argsText, setArgsText] = useState("{}");
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [argsError, setArgsError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<ToolTestResult | null>(null);

  const handleRun = async () => {
    setArgsError(null);
    const parsedArgs = buildTestArgs(argsText, variables, item.httpInputSchema);
    if (!parsedArgs) {
      setArgsError(t("tools.test.invalidJson"));
      return;
    }
    try {
      const res = await testTool(parsedArgs);
      const data = (res?.data as A)?.data as ToolTestResult | undefined;
      if (data) {
        setTestResult(data);
      }
    } catch (err) {
      const msg =
        (err as A)?.body?.message ?? (err as A)?.message ?? "Unknown error";
      setTestResult({
        status: "ERROR",
        errorMessage: msg,
        durationMs: 0,
      });
    }
  };

  const handleArgsChange = (value: string) => {
    setArgsText(value);
    setArgsError(null);
  };

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">{t("tools.details.sections.endpoint")}</Heading>
      </div>
      <Section variant="spaced">
        <SectionRow
          title={t("tools.details.fields.httpMethod")}
          value={item.httpMethod ?? "-"}
        />
        <SectionRow
          title={t("tools.details.fields.httpUrl")}
          value={
            item.httpUrl ? (
              <span className="font-mono text-ui-fg-subtle text-xs break-all">
                {item.httpUrl}
              </span>
            ) : (
              "-"
            )
          }
        />
        <SectionRow
          title={t("tools.details.fields.timeoutMs")}
          value={item.timeoutMs != null ? String(item.timeoutMs) : "-"}
        />
        <SectionRow
          title={t("tools.details.fields.maxRetries")}
          value={item.maxRetries != null ? String(item.maxRetries) : "-"}
        />
      </Section>

      <div className="px-6 py-4">
        <Heading level="h3" className="mb-4">
          {t("tools.test.title")}
        </Heading>
        <div className="flex flex-col gap-y-3">
          <PathVariablesFields
            url={item.httpUrl ?? ""}
            values={variables}
            onChange={setVariables}
          />
          <div className="flex flex-col gap-y-1">
            <label className="txt-compact-small font-medium text-ui-fg-subtle">
              {t("tools.test.argsLabel")}
            </label>
            <Textarea
              value={argsText}
              onChange={(e) => handleArgsChange(e.target.value)}
              rows={4}
              className="font-mono text-xs"
              placeholder="{}"
            />
            {argsError && (
              <span className="txt-compact-xsmall text-ui-fg-error">
                {argsError}
              </span>
            )}
          </div>
          <HttpRequestPreview
            method={item.httpMethod ?? "POST"}
            url={item.httpUrl ?? ""}
            inputSchema={item.httpInputSchema}
            args={buildTestArgs(argsText, variables, item.httpInputSchema)}
          />
          <div>
            <Button
              size="small"
              variant="secondary"
              onClick={handleRun}
              disabled={isPending}
              isLoading={isPending}
            >
              {t("tools.test.runButton")}
            </Button>
          </div>
          {testResult && (
            <div className="rounded-md border border-ui-border-base bg-ui-bg-subtle p-3 flex flex-col gap-y-2">
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
      </div>
    </Container>
  );
};
