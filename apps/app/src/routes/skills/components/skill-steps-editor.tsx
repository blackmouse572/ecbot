import {
  validateSkillSteps,
  type SkillStep,
  type SkillStepIssueCode,
} from "@repo/agent-blueprint";
import type { ToolListResponseDto } from "@repo/client";
import { useMemo, type FC } from "react";
import {
  addStep,
  moveStep,
  newStep,
  removeStep,
  updateStep,
} from "../step-tree";
import type { StepEditorApi } from "../types";
import { SkillStepList } from "./skill-step-list";

type Props = {
  steps: SkillStep[];
  onChange: (steps: SkillStep[]) => void;
  tools: ToolListResponseDto[];
  /** Show each step's issue (after the first save attempt). */
  showIssues: boolean;
};

// Editable step tree: Add step in every list, Else if / Else on an If, and
// move up, move down or delete from each step's menu.
export const SkillStepsEditor: FC<Props> = ({
  steps,
  onChange,
  tools,
  showIssues,
}) => {
  const issues = useMemo(() => {
    const map = new Map<string, SkillStepIssueCode>();
    if (!showIssues) return map;
    for (const issue of validateSkillSteps(steps))
      if (issue.id && !map.has(issue.id)) map.set(issue.id, issue.code);
    return map;
  }, [steps, showIssues]);

  const api: StepEditorApi = {
    tools,
    issues,
    add: (key, type) => onChange(addStep(steps, key, newStep(type))),
    update: (id, fn) => onChange(updateStep(steps, id, fn)),
    remove: (id) => onChange(removeStep(steps, id)),
    move: (id, by) => onChange(moveStep(steps, id, by)),
  };
  let n = 0;
  return (
    <SkillStepList
      steps={steps}
      listKey="root"
      depth={0}
      api={api}
      next={() => `${++n}`}
    />
  );
};
