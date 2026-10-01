import type { ChatToolCall } from "@/types/chat-message";
import { useEffect, useRef, useState } from "react";
import { ELAPSED_TICK_MS } from "./constants";

type Span = { start: number; end?: number };

export type ToolTimings = {
  /** Milliseconds a call has run (live while running), if known. */
  callMs: (call: ChatToolCall) => number | undefined;
  /** Milliseconds the whole turn has run (live while running), if known. */
  turnMs: number | undefined;
};

/**
 * Times a turn's tool calls on the client, so every step can count up from 0
 * while it runs. Once a registry tool returns, the step shows the server's
 * `durationMs` unless the live count already passed it (it never counts
 * backwards); built-ins report none, so their client-measured time stays.
 * Calls first seen already finished (history) show the server's time.
 */
export function useToolTimings(
  toolCalls: ChatToolCall[],
  running: boolean,
): ToolTimings {
  const spans = useRef(new Map<string, Span>());
  const turn = useRef<Span | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const at = Date.now();
  if (running && !turn.current) turn.current = { start: at };
  if (!running && turn.current && turn.current.end === undefined)
    turn.current.end = at;
  for (const call of toolCalls) {
    const span = spans.current.get(call.invocationId);
    if (call.status === "running" && !span)
      spans.current.set(call.invocationId, { start: at });
    if (call.status !== "running" && span && span.end === undefined)
      span.end = at;
  }

  const ticking = running || toolCalls.some((c) => c.status === "running");
  useEffect(() => {
    if (!ticking) return;
    const id = setInterval(() => setNow(Date.now()), ELAPSED_TICK_MS);
    return () => clearInterval(id);
  }, [ticking]);

  const measure = (span: Span | null | undefined) =>
    span ? Math.max(0, (span.end ?? now) - span.start) : undefined;

  return {
    callMs: (call) => {
      const seen = measure(spans.current.get(call.invocationId));
      if (call.status === "running" || call.durationMs === undefined)
        return seen;
      // A finished call never counts backwards: the server's time can be a
      // little shorter than what the live counter already showed.
      return seen === undefined
        ? call.durationMs
        : Math.max(call.durationMs, seen);
    },
    turnMs: measure(turn.current),
  };
}
