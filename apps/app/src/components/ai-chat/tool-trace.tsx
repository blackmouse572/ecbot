import type { ChatToolCall } from "@/types/chat-message";
import { clx } from "@medusajs/ui";
import {
  IconAsterisk,
  IconChevronDown,
  IconCircleCheck,
} from "@tabler/icons-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type FC, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CHAT_COLLAPSE_DURATION,
  CHAT_EASE_IN_OUT,
  CHAT_EASE_OUT,
  CHAT_SHIFT_DURATION,
  TOOL_STEP_ICONS,
  TRACE_ICON,
} from "./constants";
import { NumberFlow } from "./number-flow";
import { TextSwap } from "./text-swap";
import { TOOL_TRACE_ROW, TOOL_TRACE_STEP } from "./tool-trace-classes";
import { ToolTraceStep } from "./tool-trace-step";
import { useToolTimings } from "./use-tool-timings";

type Props = {
  toolCalls: ChatToolCall[];
  /** Knowledge-base sources found before the reply (shown as the first step). */
  knowledgeCount?: number;
  /** The turn is still streaming. */
  running: boolean;
};

const CALL_KINDS = new Set([
  "http",
  "mcp",
  "tool",
  "customer",
  "tag",
  "followup",
  "image",
]);
const KnowledgeIcon = TOOL_STEP_ICONS.knowledge;

/**
 * What the agent did this turn, above its reply: a summary line ("2 tools, 1
 * failed · 1.2s") over a timeline of steps joined by a line through their
 * icons. Steps arrive one by one while the turn runs; "Done" closes it.
 */
export const ToolTrace: FC<Props> = ({
  toolCalls: streamed,
  knowledgeCount,
  running,
}) => {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(true);
  // A turn that ended (stopped, errored, aborted) before a call answered
  // leaves it "running": show it as stopped instead of spinning forever.
  const toolCalls = running
    ? streamed
    : streamed.map((c) =>
        c.status === "running"
          ? {
              ...c,
              status: "error" as const,
              error: t("chatbot.chat.trace.stopped"),
            }
          : c,
      );
  const timings = useToolTimings(toolCalls, running);

  // Every failed step counts as a tool, so "failed" never outnumbers "tools".
  const failed = toolCalls.filter((c) => c.status === "error").length;
  const calls = toolCalls.filter(
    (c) => c.status === "error" || CALL_KINDS.has(c.kind ?? "tool"),
  ).length;
  const parts = [
    calls > 0 && t("chatbot.chat.trace.tools", { count: calls }),
    failed > 0 && t("chatbot.chat.trace.failed", { count: failed }),
    toolCalls.some((c) => c.kind === "skill" && c.status === "success") &&
      t("chatbot.chat.trace.loadedSkill"),
    knowledgeCount && t("chatbot.chat.trace.searchedKnowledge"),
    toolCalls.some((c) => c.kind === "handoff") &&
      t("chatbot.chat.trace.handedOver"),
  ].filter(Boolean) as string[];
  const summary = parts.join(", ");
  const label =
    running || !summary
      ? t("chatbot.chat.trace.working")
      : summary.charAt(0).toUpperCase() + summary.slice(1);

  return (
    <div className="w-full">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={clx(
          TOOL_TRACE_ROW,
          "txt-compact-small-plus hover:text-ui-fg-base cursor-pointer",
          "transition-[opacity,translate,filter] delay-80 duration-270 ease-out",
          "starting:-translate-y-1.5 starting:opacity-0 starting:blur-[2px]",
          "motion-reduce:starting:translate-y-0 motion-reduce:starting:blur-none",
        )}
      >
        <span
          className={clx(
            "text-ui-fg-muted bg-ui-bg-base relative z-10 grid size-5 shrink-0 place-items-center rounded-full",
            // The line from this icon down to the first step folds away with the list.
            "after:bg-ui-border-base after:absolute after:top-[10px] after:left-[9.5px] after:-z-10 after:h-5 after:w-px after:origin-top after:transition-transform after:duration-270 after:ease-out",
            !open && "after:scale-y-0",
          )}
        >
          {/* The asterisk turns slowly while the turn runs, then rests. */}
          <IconAsterisk
            {...TRACE_ICON}
            className={clx(
              running &&
                "animate-[spin_2.13s_linear_infinite] motion-reduce:animate-none",
            )}
          />
        </span>
        <TextSwap text={label} />{" "}
        <motion.span
          layout={reduce ? false : "position"}
          transition={{ duration: CHAT_SHIFT_DURATION, ease: CHAT_EASE_IN_OUT }}
          className="text-ui-fg-muted shrink-0"
        >
          <IconChevronDown
            size={14}
            stroke={2}
            className={clx(
              "transition-transform duration-270 ease-out",
              !open && "-rotate-90",
            )}
          />
        </motion.span>
        {timings.turnMs !== undefined && (
          <NumberFlow
            value={`${(timings.turnMs / 1000).toFixed(1)}s`}
            className="text-ui-fg-muted txt-compact-small ml-auto shrink-0"
          />
        )}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="steps"
            className="-mx-[3px] overflow-hidden px-[3px] pt-0.5"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              duration: reduce ? 0 : CHAT_COLLAPSE_DURATION,
              ease: CHAT_EASE_OUT,
            }}
          >
            {knowledgeCount ? (
              <div className={TOOL_TRACE_STEP}>
                <div className={TOOL_TRACE_ROW}>
                  <span className="bg-ui-bg-base text-ui-fg-muted relative z-10 grid size-5 shrink-0 place-items-center rounded-full">
                    <KnowledgeIcon {...TRACE_ICON} />
                  </span>
                  <span className="truncate">
                    {t("chatbot.chat.trace.knowledgeStep")}
                  </span>{" "}
                  <span className="bg-ui-bg-component txt-compact-xsmall text-ui-fg-subtle ml-auto shrink-0 rounded-md px-2 py-px">
                    {t("chatbot.chat.trace.sources", { count: knowledgeCount })}
                  </span>
                </div>
              </div>
            ) : null}
            {toolCalls.map((call) => (
              <ToolTraceStep
                key={call.invocationId}
                call={call}
                elapsedMs={timings.callMs(call)}
              />
            ))}
            {!running && (
              <div className={TOOL_TRACE_STEP}>
                <div className={TOOL_TRACE_ROW}>
                  <span className="bg-ui-bg-base text-ui-tag-green-icon relative z-10 grid size-5 shrink-0 place-items-center rounded-full">
                    <IconCircleCheck {...TRACE_ICON} />
                  </span>
                  <span>{t("chatbot.chat.trace.done")}</span>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
