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
// `toolId` points at the workspace tool, or names a built-in action
// ("system:handoff", ...); `action` picks one action of an MCP tool, or holds the
// tag or field name a built-in action needs.
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
// Actions every agent has (apps/ai system_tools), usable as Tool steps without a
// workspace tool. `needsName`: the step's `action` holds the tag or field name.
export const SKILL_SYSTEM_ACTIONS = {
  "system:handoff": { needsName: false },
  "system:notify_team": { needsName: false },
  "system:add_tag": { needsName: true },
  "system:remove_tag": { needsName: true },
  "system:schedule_followup": { needsName: false },
  "system:save_customer_field": { needsName: true },
} as const;
export type SkillSystemAction = keyof typeof SKILL_SYSTEM_ACTIONS;
const SYSTEM_PREFIX = "system:";
export const isSystemToolId = (toolId: string) =>
  toolId.startsWith(SYSTEM_PREFIX);

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
  | "tool_unknown"
  | "action_required";
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

/** The workspace tools (and MCP actions) a step tree calls, each once, in reading order. Built-in actions are left out. */
export function skillToolRefs(
  steps: SkillStep[],
): Pick<ToolStep, "toolId" | "action">[] {
  const refs = new Map<string, Pick<ToolStep, "toolId" | "action">>();
  const walk = (list: SkillStep[]) => {
    for (const step of list) {
      if (
        step.type === "tool" &&
        !blank(step.toolId) &&
        !isSystemToolId(step.toolId)
      ) {
        const ref = step.action
          ? { toolId: step.toolId, action: step.action }
          : { toolId: step.toolId };
        refs.set(`${step.toolId}:${step.action ?? ""}`, ref);
      } else if (step.type === "if") {
        step.branches.forEach((b) => walk(b.steps));
        walk(step.otherwise ?? []);
      }
    }
  };
  walk(steps);
  return [...refs.values()];
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
        else if (isSystemToolId(step.toolId)) {
          const action = SKILL_SYSTEM_ACTIONS[step.toolId as SkillSystemAction];
          if (!action) issues.push({ id: step.id, code: "tool_unknown" });
          else if (action.needsName && blank(step.action))
            issues.push({ id: step.id, code: "action_required" });
        } else if (opts.toolName && !opts.toolName(step))
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
        input.guardrails.length > 0,
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
  // The skill has Rules: a tool result is checked against them before use.
  checkRules: boolean,
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
      if (isSystemToolId(step.toolId))
        return [`${head}${compileSystemAction(step)}${how}`];
      const check = checkRules
        ? " When it returns, check the result against the Rules below before you tell the customer anything from it."
        : "";
      return [
        `${head}Call the \`${toolName(step) ?? step.action ?? step.toolId}\` tool.${how}${check}`,
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
            checkRules,
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

function compileSystemAction(step: ToolStep): string {
  const name = `"${step.action?.trim()}"`;
  switch (step.toolId as SkillSystemAction) {
    case "system:handoff":
      return 'Hand the conversation to a person now: in this same reply, before you write to the customer, call `apply_customer_tag` with the name of the tag marked "(triggers handoff)" that fits best. Writing that staff will help does nothing without this call.';
    case "system:notify_team":
      return 'Let the team know now: in this same reply, call `apply_customer_tag` with the name of the tag marked "(notifies the team)" that fits best, then go on helping the customer.';
    case "system:add_tag":
      return `Call \`apply_customer_tag\` with the tag ${name}.`;
    case "system:remove_tag":
      return `Call \`remove_customer_tag\` with the tag ${name}.`;
    case "system:schedule_followup":
      return "Call `schedule_followup` to follow up with the customer later.";
    case "system:save_customer_field":
      return `Call \`set_customer_field\` to save the customer's ${name} from what they told you.`;
    default:
      return `Call the \`${step.toolId}\` tool.`;
  }
}
