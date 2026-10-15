import {
  ChatBubble,
  CodeBranch,
  QuestionMark,
  Sparkles,
  Tools,
} from "@medusajs/icons";
import { Badge, Text } from "@medusajs/ui";
import type { SkillStep, ToolStep } from "@repo/agent-blueprint";
import type { FC, ReactNode } from "react";
import { useTranslation } from "react-i18next";

type ToolLabel = (step: Pick<ToolStep, "toolId" | "action">) => string;

type Props = {
  steps: SkillStep[];
  /** How a Tool step names its tool; falls back to the MCP action or the id. */
  toolLabel?: ToolLabel;
};

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

const Kind: FC<{ type: keyof typeof ICON; label?: string }> = ({
  type,
  label,
}) => {
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

const Row: FC<{ number: string; children: ReactNode }> = ({
  number,
  children,
}) => (
  <li className="flex items-start gap-x-2">
    <Text size="small" className="w-8 shrink-0 tabular-nums text-ui-fg-muted">
      {number}
    </Text>
    <div className="flex min-w-0 flex-1 flex-wrap items-start gap-2">
      {children}
    </div>
  </li>
);

// Read-only view of a STEPS skill, numbered like the compiled prompt
// (1, 2, 3.1, 3.2, ...).
export const SkillStepsView: FC<Props> = ({ steps, toolLabel }) => {
  const { t } = useTranslation();
  const labelOf: ToolLabel = (s) =>
    toolLabel?.(s) || s.action || t("skills.steps.unknownTool");

  // `next` hands out numbers in reading order, so nested steps number on
  // across branches (3.1, 3.2 | 3.3) like the compiled prompt.
  const render = (list: SkillStep[], next: () => string): ReactNode =>
    list.map((step) => {
      const number = next();
      if (step.type === "if") {
        let n = 0;
        const inner = () => `${number}.${++n}`;
        return (
          <li key={step.id} className="flex flex-col gap-y-2">
            {step.branches.map((b, bi) => (
              <div key={b.id} className="flex flex-col gap-y-2">
                <Row number={bi === 0 ? number : ""}>
                  <Kind
                    type="if"
                    label={
                      bi === 0 ? t("skills.steps.if") : t("skills.steps.elseIf")
                    }
                  />
                  <Text size="small">{b.condition}</Text>
                </Row>
                <ol className="ml-10 flex flex-col gap-y-2 border-l pl-3">
                  {render(b.steps, inner)}
                </ol>
              </div>
            ))}
            {!!step.otherwise?.length && (
              <div className="flex flex-col gap-y-2">
                <Row number="">
                  <Kind type="if" label={t("skills.steps.else")} />
                </Row>
                <ol className="ml-10 flex flex-col gap-y-2 border-l pl-3">
                  {render(step.otherwise, inner)}
                </ol>
              </div>
            )}
          </li>
        );
      }
      return (
        <Row key={step.id} number={number}>
          <Kind type={step.type} />
          <Text size="small" className="min-w-0">
            {step.type === "tool" ? (
              <>
                <span className="font-medium">{labelOf(step)}</span>
                {step.text ? ` · ${step.text}` : ""}
              </>
            ) : step.type === "say" ? (
              `“${step.text}”`
            ) : (
              step.text
            )}
          </Text>
        </Row>
      );
    });

  let top = 0;
  return (
    <ol className="flex flex-col gap-y-3">{render(steps, () => `${++top}`)}</ol>
  );
};
