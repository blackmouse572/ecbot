import { type FC, useState } from "react";
import type { ChatToolCall } from "@/types/chat-message";
import { IconFunctionFilled } from "@tabler/icons-react";
import { clx } from "@medusajs/ui";
import { Loader } from "@medusajs/icons";
import { Marker, MarkerContent, MarkerIcon } from "@repo/ui/common-components";

interface Props {
  toolCalls: ChatToolCall[] | undefined;
}

export const ToolCallList: FC<Props> = ({ toolCalls }) => {
  if (!toolCalls?.length) return null;
  return (
    <div className="mb-2 flex min-w-0 flex-col gap-1">
      {toolCalls.map((tc, i) => (
        <ToolCallCard key={`${tc.invocationId}-${i}`} tc={tc} />
      ))}
    </div>
  );
};

const ToolCallCard: FC<{ tc: ChatToolCall }> = ({ tc }) => {
  const [expanded, setExpanded] = useState(false);
  const label = tc.actionName ?? tc.toolName;
  return (
    <div className="min-w-0">
      <Marker
        variant="border"
        render={
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="w-full justify-between text-left"
          />
        }
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <MarkerIcon>
            {tc.status === "running" ? (
              <Loader className="animate-spin text-ui-fg-muted" />
            ) : (
              <IconFunctionFilled
                className={clx("text-ui-fg-muted", {
                  "text-ui-tag-red-icon": tc.status === "error",
                  "text-ui-tag-green-icon": tc.status === "success",
                })}
              />
            )}
          </MarkerIcon>
          <MarkerContent className="font-medium text-ui-fg-base">
            {label}
          </MarkerContent>
        </span>
        {tc.durationMs != null && (
          <span className="shrink-0 text-ui-fg-muted">{tc.durationMs}ms</span>
        )}
      </Marker>
      {expanded && (
        <div className="mt-1 max-h-64 space-y-1 overflow-auto rounded-md border border-ui-border-base bg-ui-bg-subtle px-3 py-2 font-mono text-xs">
          <div className="text-ui-fg-muted">tool:</div>
          <pre className="whitespace-pre-wrap break-words text-[10px]">
            {JSON.stringify({ id: tc.invocationId }, null, 2)}
          </pre>
          <div className="text-ui-fg-muted">args:</div>
          <pre className="whitespace-pre-wrap break-words text-[10px]">
            {JSON.stringify(tc.args, null, 2)}
          </pre>
          {tc.error ? (
            <>
              <div className="text-ui-fg-error mt-1">error:</div>
              <pre className="whitespace-pre-wrap break-words text-[10px] text-ui-fg-error">
                {tc.error}
              </pre>
            </>
          ) : tc.result != null ? (
            <>
              <div className="text-ui-fg-muted mt-1">result:</div>
              <pre className="whitespace-pre-wrap break-words text-[10px]">
                {JSON.stringify(tc.result, null, 2)}
              </pre>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
};
