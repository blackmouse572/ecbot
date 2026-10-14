import { describe, expect, it } from "vitest";
import {
  compileSkill,
  parseSkillSteps,
  skillStepsSchema,
  validateSkillSteps,
  type SkillStep,
} from "./skill-steps";

const orderTracking: SkillStep[] = [
  {
    id: "s1",
    type: "ask",
    text: "The order code, or the phone number used to order.",
  },
  {
    id: "s2",
    type: "tool",
    toolId: "t-lookup",
    text: "Look up the order with what the customer gave.",
  },
  {
    id: "s3",
    type: "if",
    branches: [
      {
        id: "b1",
        condition: "No order was found.",
        steps: [
          {
            id: "s31",
            type: "say",
            text: "Sorry, I can't find that order. Could you check the code again?",
          },
          { id: "s32", type: "tool", toolId: "t-mcp", action: "create_ticket" },
        ],
      },
      {
        id: "b2",
        condition: "The order has shipped.",
        steps: [
          {
            id: "s33",
            type: "tell",
            text: "The tracking link and the expected delivery date.",
          },
        ],
      },
    ],
    otherwise: [{ id: "s34", type: "tell", text: "The current status." }],
  },
  {
    id: "s4",
    type: "ask",
    text: "Whether they need anything else with this order.",
  },
];

const toolName = (step: { toolId: string; action?: string }) =>
  step.action ?? (step.toolId === "t-lookup" ? "lookup_order" : undefined);

describe("validateSkillSteps", () => {
  it("accepts a complete tree", () => {
    expect(validateSkillSteps(orderTracking, { toolName })).toEqual([]);
  });

  it("flags empty steps, missing tools and empty branches by id", () => {
    const steps: SkillStep[] = [
      { id: "a", type: "ask", text: "  " },
      { id: "t", type: "tool", toolId: "" },
      { id: "u", type: "tool", toolId: "gone" },
      {
        id: "i",
        type: "if",
        branches: [{ id: "b", condition: "", steps: [] }],
        otherwise: [],
      },
    ];
    expect(validateSkillSteps(steps, { toolName })).toEqual([
      { id: "a", code: "text_required" },
      { id: "t", code: "tool_required" },
      { id: "u", code: "tool_unknown" },
      { id: "b", code: "condition_required" },
      { id: "b", code: "branch_empty" },
    ]);
  });

  it("flags ids used twice anywhere in the tree", () => {
    const steps: SkillStep[] = [
      { id: "a", type: "tell", text: "x" },
      {
        id: "i",
        type: "if",
        branches: [
          {
            id: "a",
            condition: "c",
            steps: [{ id: "i", type: "tell", text: "y" }],
          },
        ],
      },
    ];
    expect(validateSkillSteps(steps)).toEqual([
      { id: "a", code: "duplicate_id" },
      { id: "i", code: "duplicate_id" },
    ]);
  });

  it("requires at least one step", () => {
    expect(validateSkillSteps([])).toEqual([{ code: "steps_empty" }]);
  });

  it("caps the total number of steps and the nesting depth", () => {
    const many: SkillStep[] = Array.from({ length: 51 }, (_, n) => ({
      id: `s${n}`,
      type: "tell",
      text: "x",
    }));
    expect(validateSkillSteps(many)).toContainEqual({ code: "too_many_steps" });

    const nest = (depth: number): SkillStep => ({
      id: `if${depth}`,
      type: "if",
      branches: [
        {
          id: `b${depth}`,
          condition: "c",
          steps: [
            depth > 1
              ? nest(depth - 1)
              : { id: "leaf", type: "tell", text: "x" },
          ],
        },
      ],
    });
    expect(validateSkillSteps([nest(3)])).toEqual([]);
    expect(validateSkillSteps([nest(4)])).toEqual([
      { id: "if1", code: "too_deep" },
    ]);
  });
});

describe("skillStepsSchema", () => {
  it("parses the step tree", () => {
    expect(skillStepsSchema.parse(orderTracking)).toEqual(orderTracking);
  });

  it("rejects an unknown step type and an over-long Say", () => {
    expect(
      skillStepsSchema.safeParse([{ id: "x", type: "goto", text: "a" }])
        .success,
    ).toBe(false);
    expect(
      skillStepsSchema.safeParse([
        { id: "x", type: "say", text: "a".repeat(1001) },
      ]).success,
    ).toBe(false);
  });
});

describe("parseSkillSteps", () => {
  it("returns the parsed tree", () => {
    expect(parseSkillSteps(orderTracking)).toEqual({
      success: true,
      steps: orderTracking,
    });
  });

  it("keys a malformed step by the nearest id", () => {
    const input = [
      { id: "ok", type: "tell", text: "x" },
      {
        id: "i",
        type: "if",
        branches: [
          {
            id: "b",
            condition: "c",
            steps: [{ id: "deep", type: "say", text: "a".repeat(1001) }],
          },
        ],
      },
      { id: "g", type: "goto" },
    ];
    expect(parseSkillSteps(input)).toEqual({
      success: false,
      issues: [
        { id: "deep", code: "invalid" },
        { id: "g", code: "invalid" },
      ],
    });
  });

  it("reports a non-list without an id", () => {
    expect(parseSkillSteps("nope")).toEqual({
      success: false,
      issues: [{ code: "invalid" }],
    });
  });
});

describe("compileSkill", () => {
  it("compiles steps with guardrails into numbered instructions", () => {
    expect(
      compileSkill({
        name: "Order tracking",
        guardrails: [
          "Never share details of an order that belongs to another phone number.",
        ],
        format: "STEPS",
        steps: orderTracking,
        toolName,
      }),
    ).toMatchSnapshot();
  });

  it("keeps Vietnamese text as written", () => {
    const out = compileSkill({
      name: "Theo dõi đơn hàng",
      guardrails: [],
      format: "STEPS",
      steps: [
        { id: "s", type: "say", text: "Dạ, mình kiểm tra đơn giúp bạn nhé!" },
      ],
      toolName,
    });
    expect(out).toContain("# Theo dõi đơn hàng");
    expect(out).toContain('"Dạ, mình kiểm tra đơn giúp bạn nhé!"');
    expect(out).not.toContain("## Rules");
  });

  it("returns content unchanged when there are no guardrails", () => {
    expect(
      compileSkill({
        name: "n",
        guardrails: [],
        format: "CONTENT",
        content: "# Refunds\n\n1. Apologize.",
      }),
    ).toBe("# Refunds\n\n1. Apologize.");
  });

  it("appends guardrails after content", () => {
    expect(
      compileSkill({
        name: "n",
        guardrails: ["No promises."],
        format: "CONTENT",
        content: "Body",
      }),
    ).toBe(
      "Body\n\n## Rules (always, even when a step says otherwise)\n- No promises.",
    );
  });
});
