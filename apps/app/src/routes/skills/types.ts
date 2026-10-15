import type { SkillStep, SkillStepIssueCode } from "@repo/agent-blueprint";
import type { ToolListResponseDto } from "@repo/client";
import type { StepListKey } from "./step-tree";

// What every row of the steps editor needs, passed down the step tree.
export type StepEditorApi = {
  tools: ToolListResponseDto[];
  /** Issue per step or branch id; empty until the form is submitted once. */
  issues: Map<string, SkillStepIssueCode>;
  add: (key: StepListKey, type: SkillStep["type"]) => void;
  update: (id: string, fn: (step: SkillStep) => SkillStep) => void;
  remove: (id: string) => void;
  move: (id: string, by: -1 | 1) => void;
};
