import type { ChatToolCall } from "@/types/chat-message";
import { IconCircleX, IconLoader2 } from "@tabler/icons-react";
import { clx } from "@medusajs/ui";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type FC, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CHAT_ACCORDION_DURATION,
  CHAT_EASE_IN_OUT,
  CHAT_EASE_OUT,
  CHAT_SHIFT_DURATION,
  TOOL_STEP_ICONS,
  TRACE_ICON,
} from "./constants";
import { NumberFlow } from "./number-flow";
import { TextSwap } from "./text-swap";
import { ToolTraceDetail } from "./tool-trace-detail";
import { TOOL_TRACE_ROW, TOOL_TRACE_STEP } from "./tool-trace-classes";

type Props = {
  call: ChatToolCall;
  elapsedMs?: number;
};

/**
 * One tool call in the trace: "Calling lookup_order" with a spinner and a
 * live timer, then "Called lookup_order" with its time. A finished row opens
 * its arguments and result.
 */
export const ToolTraceStep: FC<Props> = ({ call, elapsedMs }) => {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const detailId = useId();
  const running = call.status === "running";
  const failed = call.status === "error";
  const kind = call.kind ?? "tool";
  const Icon = TOOL_STEP_ICONS[kind];

  const verb = running
    ? kind === "skill"
      ? t("chatbot.chat.trace.loadingSkill")
      : t("chatbot.chat.trace.calling")
    : failed
      ? t("chatbot.chat.trace.failedStep")
      : kind === "skill"
        ? t("chatbot.chat.trace.loadedSkillStep")
        : kind === "handoff"
          ? t("chatbot.chat.trace.handedOverStep")
          : t("chatbot.chat.trace.called");
  const slug = typeof call.args.slug === "string" ? call.args.slug : undefined;
  // A handoff reads as a sentence on its own ("Handed over to staff").
  const name =
    kind === "skill" && slug
      ? slug
      : kind === "handoff" && !running
        ? ""
        : call.toolName;
  const tag = call.label ?? t(`chatbot.chat.trace.kind.${kind}`);

  return (
    <div className={TOOL_TRACE_STEP}>
      <button
        type="button"
        disabled={running}
        aria-expanded={open}
        aria-controls={open ? detailId : undefined}
        onClick={() => setOpen((o) => !o)}
        className={clx(
          TOOL_TRACE_ROW,
          "group/step cursor-pointer disabled:cursor-default",
        )}
      >
        <span
          className={clx(
            "bg-ui-bg-base relative z-10 grid size-5 shrink-0 place-items-center rounded-full",
            failed ? "text-ui-fg-error" : "text-ui-fg-muted",
          )}
        >
          {running ? (
            <IconLoader2
              {...TRACE_ICON}
              className="animate-[spin_1.2s_linear_infinite] motion-reduce:animate-none"
            />
          ) : failed ? (
            <IconCircleX
              {...TRACE_ICON}
              className="starting:scale-90 starting:opacity-0 transition-[opacity,scale] duration-270 ease-out"
            />
          ) : (
            <Icon
              {...TRACE_ICON}
              className="starting:scale-90 starting:opacity-0 transition-[opacity,scale] duration-270 ease-out"
            />
          )}
        </span>
        <span className="flex min-w-0 items-baseline gap-1">
          <TextSwap
            text={verb}
            className={clx("shrink-0", failed && "text-ui-fg-error")}
          />{" "}
          {name && (
            <motion.code
              layout={reduce ? false : "position"}
              transition={{
                duration: CHAT_SHIFT_DURATION,
                ease: CHAT_EASE_IN_OUT,
              }}
              className="text-ui-fg-base group-hover/step:text-ui-fg-base min-w-0 truncate font-mono text-xs leading-[18px]"
            >
              {name}
            </motion.code>
          )}
        </span>{" "}
        <span className="bg-ui-bg-component txt-compact-xsmall text-ui-fg-subtle ml-auto shrink-0 rounded-md px-2 py-px">
          {tag}
        </span>{" "}
        {elapsedMs !== undefined && (
          <NumberFlow
            value={`${Math.round(elapsedMs)}ms`}
            className={clx(
              "min-w-[42px] shrink-0 justify-end font-mono text-[11px]",
              failed ? "text-ui-fg-error" : "text-ui-fg-muted",
            )}
          />
        )}
      </button>
      <AnimatePresence initial={false}>
        {open && !running && (
          <motion.div
            key="detail"
            className="ml-[30px] overflow-hidden px-[3px]"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              duration: reduce ? 0 : CHAT_ACCORDION_DURATION,
              ease: CHAT_EASE_OUT,
            }}
          >
            <ToolTraceDetail call={call} id={detailId} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
