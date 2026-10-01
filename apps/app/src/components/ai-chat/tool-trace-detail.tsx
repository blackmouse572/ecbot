import type { ChatToolCall } from "@/types/chat-message";
import { SquareTwoStack } from "@medusajs/icons";
import { clx, IconButton, Tooltip } from "@medusajs/ui";
import { type FC, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { JsonBlock } from "./json-block";

type Props = {
  call: ChatToolCall;
  id: string;
};

const COPIED_MS = 1400;

/** A finished call's arguments and result (or error), with a copy button. */
export const ToolTraceDetail: FC<Props> = ({ call, id }) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const failed = call.status === "error";
  const payload = failed
    ? { arguments: call.args, error: call.error }
    : { arguments: call.args, result: call.result };

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = () => {
    navigator.clipboard
      ?.writeText(JSON.stringify(payload, null, 2))
      .then(() => setCopied(true))
      .catch(() => undefined);
  };

  const label = (text: string, isError = false) => (
    <span
      className={clx(
        "txt-compact-xsmall-plus mt-2 mb-0.5 block tracking-wide uppercase",
        isError ? "text-ui-fg-error" : "text-ui-fg-muted",
      )}
    >
      {text}
    </span>
  );

  return (
    <div
      id={id}
      role="region"
      aria-label={call.toolName}
      className="bg-ui-bg-subtle shadow-elevation-card-rest my-1 rounded-xl px-3.5 pt-2.5 pb-3"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="txt-compact-xsmall-plus text-ui-fg-subtle">JSON</span>
        <Tooltip
          content={
            copied
              ? t("chatbot.chat.trace.copied")
              : t("chatbot.chat.trace.copy")
          }
        >
          <IconButton
            type="button"
            size="small"
            variant="transparent"
            aria-label={t("chatbot.chat.trace.copy")}
            onClick={copy}
          >
            <SquareTwoStack />
          </IconButton>
        </Tooltip>
      </div>
      {label(t("chatbot.chat.trace.arguments"))}
      <JsonBlock value={call.args} />
      {failed ? (
        <>
          {label(t("chatbot.chat.trace.error"), true)}
          <JsonBlock value={call.error ?? null} error />
        </>
      ) : (
        <>
          {label(t("chatbot.chat.trace.result"))}
          <JsonBlock value={call.result ?? null} />
        </>
      )}
    </div>
  );
};
