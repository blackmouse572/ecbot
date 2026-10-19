import type { ToolKind } from "@/types/chat-message";
import {
  type Icon,
  IconBolt,
  IconBook2,
  IconClock,
  IconFunction,
  IconHeadset,
  IconPhoto,
  IconPlug,
  IconTag,
  IconUser,
} from "@tabler/icons-react";

// The agent's image and file tools; their result arrives as a `file` part
// rendered as the image or file itself, so the tool call is not shown as a card.
export const FILE_TOOL_PARTS = new Set(["tool-send_image", "tool-send_media"]);

// Kinds of the agent's built-in tools, for streams from an AI service that
// predates `data-tool-meta`. Mirrors SYSTEM_TOOL_KINDS in apps/ai.
export const BUILT_IN_TOOL_KINDS: Record<string, ToolKind> = {
  load_skill: "skill",
  get_customer_field: "customer",
  list_customer_fields: "customer",
  set_customer_field: "customer",
  update_customer_profile: "customer",
  apply_customer_tag: "tag",
  remove_customer_tag: "tag",
  schedule_followup: "followup",
  list_pending_followups: "followup",
  cancel_followup: "followup",
  send_image: "image",
  send_media: "image",
};

// Motion for the chat (tool trace, text swaps, bubbles). Curves mirror the
// `--ease-out` / `--ease-in-out` tokens in src/index.css. Durations run a
// little slower than the generic UI defaults: this is a calm, read-along view.
export const CHAT_EASE_OUT = [0.23, 1, 0.32, 1] as const;
export const CHAT_EASE_IN_OUT = [0.77, 0, 0.175, 1] as const;
export const CHAT_SWAP_DURATION = 0.27;
export const CHAT_SWAP_EXIT_DURATION = 0.2;
export const CHAT_SHIFT_DURATION = 0.29;
export const CHAT_COLLAPSE_DURATION = 0.27;
export const CHAT_ACCORDION_DURATION = 0.32;

// The live elapsed counter ticks at this rate while a call runs.
export const ELAPSED_TICK_MS = 120;

// Icon per kind of step in the tool trace (`knowledge` is the RAG search row).
export const TOOL_STEP_ICONS: Record<ToolKind | "knowledge", Icon> = {
  http: IconFunction,
  tool: IconFunction,
  mcp: IconPlug,
  skill: IconBolt,
  customer: IconUser,
  tag: IconTag,
  handoff: IconHeadset,
  followup: IconClock,
  image: IconPhoto,
  knowledge: IconBook2,
};

// Tabler icon size and stroke for the tool trace rows.
export const TRACE_ICON = { size: 16, stroke: 1.75 } as const;
