import type { SkillStep } from "@repo/agent-blueprint";

// Immutable edits on a skill's step tree. A step list is addressed by a key:
// "root", a branch id (If / Else if), or elseKey(ifId) for an Else.
export type StepListKey = string;
export const elseKey = (ifId: string): StepListKey => `${ifId}:else`;

const mapListsIn = (
  list: SkillStep[],
  key: StepListKey,
  fn: (key: StepListKey, list: SkillStep[]) => SkillStep[],
): SkillStep[] =>
  fn(key, list).map((step) =>
    step.type !== "if"
      ? step
      : {
          ...step,
          branches: step.branches.map((b) => ({
            ...b,
            steps: mapListsIn(b.steps, b.id, fn),
          })),
          ...(step.otherwise && {
            otherwise: mapListsIn(step.otherwise, elseKey(step.id), fn),
          }),
        },
  );

const mapLists = (
  steps: SkillStep[],
  fn: (key: StepListKey, list: SkillStep[]) => SkillStep[],
) => mapListsIn(steps, "root", fn);

export const addStep = (
  steps: SkillStep[],
  key: StepListKey,
  step: SkillStep,
) => mapLists(steps, (k, l) => (k === key ? [...l, step] : l));

export const removeStep = (steps: SkillStep[], id: string) =>
  mapLists(steps, (_, l) => l.filter((s) => s.id !== id));

export const updateStep = (
  steps: SkillStep[],
  id: string,
  fn: (step: SkillStep) => SkillStep,
) => mapLists(steps, (_, l) => l.map((s) => (s.id === id ? fn(s) : s)));

export const moveStep = (steps: SkillStep[], id: string, by: -1 | 1) =>
  mapLists(steps, (_, l) => {
    const i = l.findIndex((s) => s.id === id);
    const j = i + by;
    if (i === -1 || j < 0 || j >= l.length) return l;
    const next = [...l];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });

export const newId = () => crypto.randomUUID().slice(0, 8);

export const newBranch = () => ({ id: newId(), condition: "", steps: [] });

export const newStep = (type: SkillStep["type"]): SkillStep => {
  const id = newId();
  if (type === "tool") return { id, type, toolId: "" };
  if (type === "if") return { id, type, branches: [newBranch()] };
  return { id, type, text: "" };
};
