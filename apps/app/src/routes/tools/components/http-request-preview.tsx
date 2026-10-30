import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { httpRequestPreviewText } from "./http-request-preview-text";

type HttpRequestPreviewProps = {
  method: string;
  url: string;
  inputSchema?: unknown;
  /** Null while the args JSON does not parse. */
  args: Record<string, unknown> | null;
};

/** Where each test argument goes (path, query or body) before Run Test. */
export const HttpRequestPreview: FC<HttpRequestPreviewProps> = ({
  method,
  url,
  inputSchema,
  args,
}) => {
  const { t } = useTranslation();
  if (!url || !args) return null;

  const preview = httpRequestPreviewText({
    method,
    url,
    inputSchema,
    args,
  });

  return (
    <div className="flex flex-col gap-y-1">
      <span className="txt-compact-small text-ui-fg-subtle">
        {t("tools.test.previewLabel")}
      </span>
      <div className="rounded-md border border-ui-border-base bg-ui-bg-field p-2 flex flex-col gap-y-1">
        {"problem" in preview ? (
          <span className="txt-compact-small text-ui-fg-error break-all">
            {t(`tools.test.preview.${preview.problem.kind}`, {
              placeholder: `{${preview.problem.name}}`,
              name: preview.problem.name,
            })}
          </span>
        ) : (
          <>
            <span className="font-mono text-xs text-ui-fg-base break-all">
              {preview.line}
            </span>
            {preview.body && (
              <pre className="font-mono text-xs text-ui-fg-subtle whitespace-pre-wrap break-all max-h-40 overflow-auto">
                {preview.body}
              </pre>
            )}
          </>
        )}
      </div>
    </div>
  );
};
