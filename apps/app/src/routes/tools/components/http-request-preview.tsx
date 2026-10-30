import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { httpRequestPreviewText } from "./http-request-preview-text";

type HttpRequestPreviewProps = {
  method: string;
  url: string;
  inputSchema?: unknown;
  argsText: string;
};

/** Where each test argument goes (path, query or body) before Run Test. */
export const HttpRequestPreview: FC<HttpRequestPreviewProps> = ({
  method,
  url,
  inputSchema,
  argsText,
}) => {
  const { t } = useTranslation();
  let args: unknown;
  try {
    args = JSON.parse(argsText || "{}");
  } catch {
    return null;
  }
  if (!url || typeof args !== "object" || args === null || Array.isArray(args))
    return null;

  const preview = httpRequestPreviewText({
    method,
    url,
    inputSchema,
    args: args as Record<string, unknown>,
  });

  return (
    <div className="flex flex-col gap-y-1">
      <span className="txt-compact-small text-ui-fg-subtle">
        {t("tools.test.previewLabel")}
      </span>
      <div className="rounded-md border border-ui-border-base bg-ui-bg-field p-2 flex flex-col gap-y-1">
        {"error" in preview ? (
          <span className="font-mono text-xs text-ui-fg-error break-all">
            {preview.error}
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
