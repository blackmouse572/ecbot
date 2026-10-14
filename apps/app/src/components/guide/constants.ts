import { ChatBubbleLeftRight, FolderOpen, Puzzle } from "@medusajs/icons";
import { ROUTES } from "@/routes/constants";
import type { GuideFeature } from "./types";

/** Landing-page gradients, cropped and compressed to a few KB each. */
const BACKGROUNDS = {
  sunset: "/images/onboarding/bg-sunset.webp",
  ember: "/images/onboarding/bg-ember.webp",
  dusk: "/images/onboarding/bg-dusk.webp",
  night: "/images/onboarding/bg-night.webp",
};

export const GUIDE_BACKGROUND: Record<GuideFeature, string> = {
  chatbot: BACKGROUNDS.sunset,
  accounts: BACKGROUNDS.ember,
  conversations: BACKGROUNDS.sunset,
  knowledge: BACKGROUNDS.dusk,
  tools: BACKGROUNDS.night,
  skills: BACKGROUNDS.ember,
};

export const CELEBRATION_BACKGROUND = BACKGROUNDS.sunset;

/** The tour after the first agent goes live: each step points at the
 * sidebar link of a page the owner needs next. */
export const TOUR_STEPS = [
  {
    feature: "conversations",
    route: ROUTES.Conversations,
    icon: ChatBubbleLeftRight,
  },
  { feature: "knowledge", route: ROUTES.KnowledgeBase, icon: FolderOpen },
  { feature: "tools", route: ROUTES.Tools, icon: Puzzle },
] as const;

export const GUIDE_STORAGE_PREFIX = "ecbot.guide";

/** Routes that open over the page (builder, create and edit forms); the
 * tour waits until they close. */
export const OVERLAY_ROUTE = /\/(create|edit|clone)(\/|$)/;

export const CONFETTI_COUNT = 32;
export const CONFETTI_COLORS = [
  "bg-ui-tag-blue-icon",
  "bg-ui-tag-green-icon",
  "bg-ui-tag-orange-icon",
  "bg-ui-tag-purple-icon",
  "bg-ui-tag-red-icon",
];
