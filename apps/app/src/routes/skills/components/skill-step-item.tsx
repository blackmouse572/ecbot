import { Input, Text, Textarea } from "@medusajs/ui";
import type { SkillStep } from "@repo/agent-blueprint";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import type { StepEditorApi } from "../types";
import { SkillIfStep } from "./skill-if-step";
import { SkillStepActions } from "./skill-step-actions";
import { SkillStepIssue } from "./skill-step-issue";
import { SkillStepKind } from "./skill-step-kind";
import { SkillToolStepFields } from "./skill-tool-step-fields";

type Props = {
  step: SkillStep;
  number: string;
  depth: number;
  api: StepEditorApi;
  first: boolean;
  last: boolean;
};

// One editable step. An If renders its branches; the rest are one row.
export const SkillStepItem: FC<Props> = (props) => {
  const { step, number, api, first, last } = props;
  const { t } = useTranslation();
  const actions = (
    <SkillStepActions
      first={first}
      last={last}
      onMove={(by) => api.move(step.id, by)}
      onRemove={() => api.remove(step.id)}
    />
  );
  if (step.type === "if")
    return <SkillIfStep {...props} step={step} actions={actions} />;

  const setText = (text: string) =>
    api.update(step.id, (s) => ({ ...s, text }) as SkillStep);

  return (
    <div className="flex flex-col gap-y-1">
      <div className="flex items-start gap-x-2">
        <Text
          size="small"
          className="w-8 shrink-0 pt-1.5 tabular-nums text-ui-fg-muted"
        >
          {number}
        </Text>
        <div className="pt-1">
          <SkillStepKind type={step.type} />
        </div>
        <div className="min-w-0 flex-1">
          {step.type === "tool" ? (
            <SkillToolStepFields step={step} api={api} />
          ) : step.type === "say" ? (
            <Textarea
              rows={2}
              value={step.text}
              placeholder={t("skills.steps.placeholder.say")}
              onChange={(e) => setText(e.target.value)}
            />
          ) : (
            <Input
              size="small"
              value={step.text}
              placeholder={t(`skills.steps.placeholder.${step.type}`)}
              onChange={(e) => setText(e.target.value)}
            />
          )}
        </div>
        {actions}
      </div>
      <SkillStepIssue code={api.issues.get(step.id)} />
    </div>
  );
};
