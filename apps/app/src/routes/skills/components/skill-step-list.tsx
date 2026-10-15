import { SKILL_STEP_MAX_DEPTH, type SkillStep } from "@repo/agent-blueprint";
import type { FC } from "react";
import type { StepListKey } from "../step-tree";
import type { StepEditorApi } from "../types";
import { SkillAddStepMenu } from "./skill-add-step-menu";
import { SkillStepItem } from "./skill-step-item";

type Props = {
  steps: SkillStep[];
  listKey: StepListKey;
  depth: number;
  api: StepEditorApi;
  /** Hands out step numbers in reading order (1, 2, 3.1, ...). */
  next: () => string;
};

// One editable list of steps (the skill, or an If branch), with Add step.
export const SkillStepList: FC<Props> = ({
  steps,
  listKey,
  depth,
  api,
  next,
}) => (
  <div className="flex flex-col gap-y-3">
    {steps.map((step, i) => (
      <SkillStepItem
        key={step.id}
        step={step}
        number={next()}
        depth={depth}
        api={api}
        first={i === 0}
        last={i === steps.length - 1}
      />
    ))}
    <SkillAddStepMenu
      canIf={depth < SKILL_STEP_MAX_DEPTH}
      onAdd={(type) => api.add(listKey, type)}
    />
  </div>
);
