import * as z from "zod";

// A Skill is written either as free markdown (CONTENT) or as structured steps
// (STEPS). Both compile to the one markdown body the agent loads with
// `load_skill`, so the AI service never sees the step tree.

export const SKILL_STEPS_MAX = 50;
export const SKILL_STEP_MAX_DEPTH = 3;
export const SKILL_STEP_TEXT_MAX = 2000;
export const SKILL_SAY_TEXT_MAX = 1000;
export const SKILL_GUARDRAILS_MAX = 20;
export const SKILL_GUARDRAIL_MAX = 500;

export type AskStep = { id: string; type: "ask"; text: string };
export type SayStep = { id: string; type: "say"; text: string };
export type TellStep = { id: string; type: "tell"; text: string };
// `toolId` points at the workspace tool; `action` picks one action of an MCP tool.
export type ToolStep = {
  id: string;
  type: "tool";
  toolId: string;
  action?: string;
  text?: string;
};
export type IfBranch = { id: string; condition: string; steps: SkillStep[] };
// `branches` holds the If and its Else ifs, in order; `otherwise` is the Else.
export type IfStep = {
  id: string;
  type: "if";
  branches: IfBranch[];
  otherwise?: SkillStep[];
};
export type SkillStep = AskStep | SayStep | TellStep | ToolStep | IfStep;

const id = z.string().min(1).max(64);
const text = z.string().max(SKILL_STEP_TEXT_MAX);

export const skillStepSchema: z.ZodType<SkillStep> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.object({ id, type: z.literal("ask"), text }),
    z.object({
      id,
      type: z.literal("say"),
      text: z.string().max(SKILL_SAY_TEXT_MAX),
    }),
    z.object({ id, type: z.literal("tell"), text }),
    z.object({
      id,
      type: z.literal("tool"),
      toolId: z.string().max(64),
      action: z.string().max(200).optional(),
      text: text.optional(),
    }),
    z.object({
      id,
      type: z.literal("if"),
      branches: z
        .array(
          z.object({ id, condition: text, steps: z.array(skillStepSchema) }),
        )
        .min(1),
      otherwise: z.array(skillStepSchema).optional(),
    }),
  ]),
);
export const skillStepsSchema = z.array(skillStepSchema);

export type SkillStepIssueCode =
  | "invalid"
  | "duplicate_id"
  | "steps_empty"
  | "too_many_steps"
  | "too_deep"
  | "text_required"
  | "condition_required"
  | "branch_empty"
  | "tool_required"
  | "tool_unknown";
/** `id` is the step or branch the issue belongs to; none for the whole list. */
export type SkillStepIssue = { id?: string; code: SkillStepIssueCode };

/** The name the agent calls a Tool step's tool by, or undefined when it no longer exists. */
export type SkillToolNamer = (
  step: Pick<ToolStep, "toolId" | "action">,
) => string | undefined;

const blank = (s: string | undefined) => !s?.trim();

/** Parses an untrusted step tree; a malformed step is reported as `invalid` on the nearest id. */
export function parseSkillSteps(
  input: unknown,
):
  | { success: true; steps: SkillStep[] }
  | { success: false; issues: SkillStepIssue[] } {
  const parsed = skillStepsSchema.safeParse(input);
  if (parsed.success) return { success: true, steps: parsed.data };
  const issues: SkillStepIssue[] = [];
  for (const { path } of parsed.error.issues) {
    let node: unknown = input;
    let id: string | undefined;
    for (const key of path) {
      if (node === null || typeof node !== "object") break;
      node = (node as Record<PropertyKey, unknown>)[key];
      const nodeId = (node as { id?: unknown } | null)?.id;
      if (typeof nodeId === "string") id = nodeId;
    }
    if (!issues.some((i) => i.id === id))
      issues.push(
        id === undefined ? { code: "invalid" } : { id, code: "invalid" },
      );
  }
  return { success: false, issues };
}

/** Everything that would stop a step list from compiling, in reading order. */
export function validateSkillSteps(
  steps: SkillStep[],
  opts: { toolName?: SkillToolNamer } = {},
): SkillStepIssue[] {
  const issues: SkillStepIssue[] = [];
  if (steps.length === 0) return [{ code: "steps_empty" }];
  let count = 0;
  // Issues are keyed by id, so ids must be unique across the whole tree.
  const seen = new Set<string>();
  const mark = (id: string) => {
    if (seen.has(id)) issues.push({ id, code: "duplicate_id" });
    seen.add(id);
  };

  const walk = (list: SkillStep[], depth: number) => {
    for (const step of list) {
      count++;
      mark(step.id);
      if (step.type === "if") {
        if (depth >= SKILL_STEP_MAX_DEPTH) {
          issues.push({ id: step.id, code: "too_deep" });
          continue;
        }
        for (const branch of step.branches) {
          mark(branch.id);
          if (blank(branch.condition))
            issues.push({ id: branch.id, code: "condition_required" });
          if (branch.steps.length === 0)
            issues.push({ id: branch.id, code: "branch_empty" });
          walk(branch.steps, depth + 1);
        }
        walk(step.otherwise ?? [], depth + 1);
      } else if (step.type === "tool") {
        if (blank(step.toolId))
          issues.push({ id: step.id, code: "tool_required" });
        else if (opts.toolName && !opts.toolName(step))
          issues.push({ id: step.id, code: "tool_unknown" });
      } else if (blank(step.text)) {
        issues.push({ id: step.id, code: "text_required" });
      }
    }
  };
  walk(steps, 0);
  if (count > SKILL_STEPS_MAX) issues.unshift({ code: "too_many_steps" });
  return issues;
}

export type CompileSkillInput =
  | { name: string; guardrails: string[]; format: "CONTENT"; content: string }
  | {
      name: string;
      guardrails: string[];
      format: "STEPS";
      steps: SkillStep[];
      toolName: SkillToolNamer;
    };

/** The markdown body stored for `load_skill`. Validate steps first: invalid ones compile as written. */
export function compileSkill(input: CompileSkillInput): string {
  const rules = input.guardrails.length
    ? `## Rules (always, even when a step says otherwise)\n${input.guardrails.map((g) => `- ${g.trim()}`).join("\n")}`
    : "";
  if (input.format === "CONTENT")
    return [input.content, rules].filter(Boolean).join("\n\n");

  const lines: string[] = [];
  let top = 0;
  for (const [i, step] of input.steps.entries()) {
    top++;
    const counter = { n: 0 };
    lines.push(
      ...compileStep(
        step,
        `${top}.`,
        "",
        input.toolName,
        `${top}`,
        counter,
        i < input.steps.length - 1 ? top + 1 : undefined,
      ),
    );
  }
  const body = `## Steps\nFollow these steps in order, one at a time.\n${lines.join("\n")}`;
  return [`# ${input.name.trim()}`, body, rules].filter(Boolean).join("\n\n");
}

const sentence = (s: string) => s.trim().replace(/[.:;]+$/, "");

function compileStep(
  step: SkillStep,
  label: string,
  indent: string,
  toolName: SkillToolNamer,
  prefix: string,
  counter: { n: number },
  next: number | undefined,
): string[] {
  const head = `${indent}${label} `;
  switch (step.type) {
    case "ask":
      return [
        `${head}Ask the customer for: ${sentence(step.text)}. If they already gave it in this conversation, do not ask again: use it and go on. Otherwise wait for their answer.`,
      ];
    case "say":
      return [
        `${head}Send this message: "${step.text.trim()}". Use these exact words when the customer writes in the same language, otherwise a faithful translation. Do not wait for an answer: go on with the next step.`,
      ];
    case "tell":
      return [
        `${head}Tell the customer, in your own words: ${sentence(step.text)}.`,
      ];
    case "tool": {
      const how = blank(step.text) ? "" : ` How: ${sentence(step.text!)}.`;
      return [
        `${head}Call the \`${toolName(step) ?? step.action ?? step.toolId}\` tool.${how}`,
      ];
    }
    case "if": {
      const inner = `${indent}   `;
      const nested = (steps: SkillStep[]) =>
        steps.flatMap((s) => {
          counter.n++;
          return compileStep(
            s,
            `${prefix}.${counter.n}.`,
            inner,
            toolName,
            `${prefix}.${counter.n}`,
            { n: 0 },
            undefined,
          );
        });
      const out: string[] = [];
      step.branches.forEach((branch, i) => {
        const cond = `if this is true: ${sentence(branch.condition)}.`;
        out.push(
          i === 0 ? `${head}I${cond.slice(1)}` : `${inner}Else, ${cond}`,
        );
        out.push(...nested(branch.steps));
      });
      if (step.otherwise?.length) {
        out.push(`${inner}Otherwise:`);
        out.push(...nested(step.otherwise));
      }
      if (next !== undefined)
        out.push(`${inner}Then continue with step ${next}.`);
      return out;
    }
  }
}
