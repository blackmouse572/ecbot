import type { SkillStep } from "@repo/agent-blueprint";
import { describe, expect, it } from "vitest";
import {
  addStep,
  elseKey,
  moveStep,
  newStep,
  removeStep,
  updateStep,
} from "./step-tree";

const tree: SkillStep[] = [
  { id: "a", type: "ask", text: "A" },
  {
    id: "i",
    type: "if",
    branches: [
      {
        id: "b1",
        condition: "x",
        steps: [{ id: "c", type: "tell", text: "C" }],
      },
    ],
    otherwise: [{ id: "d", type: "say", text: "D" }],
  },
  { id: "e", type: "tell", text: "E" },
];

describe("step tree", () => {
  it("adds a step to the root, a branch or an Else", () => {
    const s = { id: "n", type: "ask", text: "" } as const;
    expect(addStep(tree, "root", s).at(-1)).toEqual(s);
    const inBranch = addStep(tree, "b1", s)[1] as Extract<
      SkillStep,
      { type: "if" }
    >;
    expect(inBranch.branches[0].steps.map((x) => x.id)).toEqual(["c", "n"]);
    const inElse = addStep(tree, elseKey("i"), s)[1] as Extract<
      SkillStep,
      { type: "if" }
    >;
    expect(inElse.otherwise!.map((x) => x.id)).toEqual(["d", "n"]);
  });

  it("removes, updates and moves a step wherever it is", () => {
    const removed = removeStep(tree, "c")[1] as Extract<
      SkillStep,
      { type: "if" }
    >;
    expect(removed.branches[0].steps).toEqual([]);
    expect(
      updateStep(tree, "d", (s) => ({ ...s, text: "D2" }) as SkillStep)[1],
    ).toMatchObject({
      otherwise: [{ id: "d", text: "D2" }],
    });
    expect(moveStep(tree, "e", -1).map((s) => s.id)).toEqual(["a", "e", "i"]);
    expect(moveStep(tree, "a", -1)).toEqual(tree);
    expect(moveStep(tree, "e", 1)).toEqual(tree);
  });

  it("makes empty steps with unique ids", () => {
    const a = newStep("tool");
    const b = newStep("if");
    expect(a).toMatchObject({ type: "tool", toolId: "" });
    expect(b).toMatchObject({
      type: "if",
      branches: [{ condition: "", steps: [] }],
    });
    expect(
      new Set([
        a.id,
        b.id,
        (b as Extract<SkillStep, { type: "if" }>).branches[0].id,
      ]).size,
    ).toBe(3);
  });
});
