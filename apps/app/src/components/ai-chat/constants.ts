import type { ToolKind } from "@/types/chat-message";
import {
  BookOpen,
  Bolt,
  Clock,
  Photo,
  ServerStack,
  Tag,
  User,
  Users,
} from "@medusajs/icons";
import { IconFunction } from "@tabler/icons-react";
import type { ComponentType, SVGProps } from "react";

// The agent's image tool; its result arrives as a `file` part rendered as the
// image itself, so the tool call is not shown as a card.
export const SEND_IMAGE_TOOL_PART = "tool-send_image";

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
};

// Motion for the chat (tool trace, text swaps, bubbles). Curves mirror the
// `--ease-out` / `--ease-in-out` tokens in src/index.css. Durations run a
// little slower than the generic UI defaults: this is a calm, read-along view.
export const CHAT_EASE_OUT = [0.23, 1, 0.32, 1] as const;
export const CHAT_EASE_IN_OUT = [0.77, 0, 0.175, 1] as const;
export const CHAT_SWAP_DURATION = 0.27;
export const CHAT_SHIFT_DURATION = 0.29;
export const CHAT_ACCORDION_DURATION = 0.32;

// The live elapsed counter ticks at this rate while a call runs.
export const ELAPSED_TICK_MS = 90;

// Icon per kind of step in the tool trace (`knowledge` is the RAG search row).
export const TOOL_STEP_ICONS: Record<
  ToolKind | "knowledge",
  ComponentType<SVGProps<SVGSVGElement>>
> = {
  http: IconFunction,
  tool: IconFunction,
  mcp: ServerStack,
  skill: Bolt,
  customer: User,
  tag: Tag,
  handoff: Users,
  followup: Clock,
  image: Photo,
  knowledge: BookOpen,
};
