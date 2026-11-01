import {
  ChatBubble,
  CodeBranch,
  QuestionMark,
  Sparkles,
  Tools,
} from "@medusajs/icons";
import { Badge } from "@medusajs/ui";
import type { SkillStep } from "@repo/agent-blueprint";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

const ICON = {
  ask: QuestionMark,
  say: ChatBubble,
  tell: Sparkles,
  tool: Tools,
  if: CodeBranch,
} as const;

// Each step type keeps one tag color, so a long list scans by type.
const COLOR = {
  ask: { badge: "blue", icon: "text-ui-tag-blue-icon" },
  say: { badge: "green", icon: "text-ui-tag-green-icon" },
  tell: { badge: "purple", icon: "text-ui-tag-purple-icon" },
  tool: { badge: "orange", icon: "text-ui-tag-orange-icon" },
  if: { badge: "grey", icon: "text-ui-tag-neutral-icon" },
} as const;

type Props = { type: SkillStep["type"]; label?: string };

// The colored badge naming a step's type (Ask, Say, Tell, Tool, If).
export const SkillStepKind: FC<Props> = ({ type, label }) => {
  const { t } = useTranslation();
  const Icon = ICON[type];
  return (
    <Badge
      size="2xsmall"
      color={COLOR[type].badge}
      className="shrink-0 gap-x-1"
    >
      <Icon className={COLOR[type].icon} />
      {label ?? t(`skills.steps.${type}`)}
    </Badge>
  );
};
