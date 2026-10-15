import { describe, expect, it } from "vitest";
import {
  compileSkill,
  parseSkillSteps,
  skillStepsSchema,
  skillToolRefs,
  validateSkillSteps,
  withoutSkillRules,
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

describe("skillToolRefs", () => {
  it("lists each workspace tool and action once, nested steps included", () => {
    expect(
      skillToolRefs([
        ...orderTracking,
        { id: "again", type: "tool", toolId: "t-lookup" },
        { id: "blank", type: "tool", toolId: "" },
        { id: "builtin", type: "tool", toolId: "system:handoff" },
      ]),
    ).toEqual([
      { toolId: "t-lookup" },
      { toolId: "t-mcp", action: "create_ticket" },
    ]);
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

  it("goes on after a Say instead of ending the turn", () => {
    const out = compileSkill({
      name: "n",
      guardrails: [],
      format: "STEPS",
      steps: [{ id: "s", type: "say", text: "Hi" }],
      toolName,
    });
    expect(out).toContain(
      "Do not wait for an answer: go on with the next step.",
    );
  });

  it("checks a tool's result against the rules only when there are rules", () => {
    const check =
      "When it returns, check the result against the Rules below before you tell the customer anything from it.";
    const compile = (guardrails: string[]) =>
      compileSkill({
        name: "n",
        guardrails,
        format: "STEPS",
        steps: [{ id: "t", type: "tool", toolId: "t-lookup" }],
        toolName,
      });
    expect(compile(["No promises."])).toContain(check);
    expect(compile([])).not.toContain(check);
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

describe("built-in actions", () => {
  const compile = (steps: SkillStep[], guardrails: string[] = []) =>
    compileSkill({
      name: "T",
      guardrails,
      format: "STEPS",
      steps,
      toolName: () => undefined,
    });

  it("are valid without a workspace tool", () => {
    expect(
      validateSkillSteps(
        [{ id: "h", type: "tool", toolId: "system:handoff" }],
        { toolName: () => undefined },
      ),
    ).toEqual([]);
  });

  it("need a tag or field name where the action takes one", () => {
    expect(
      validateSkillSteps(
        [
          { id: "a", type: "tool", toolId: "system:add_tag" },
          {
            id: "f",
            type: "tool",
            toolId: "system:save_customer_field",
            action: " ",
          },
          { id: "x", type: "tool", toolId: "system:nope" },
        ],
        { toolName: () => undefined },
      ),
    ).toEqual([
      { id: "a", code: "action_required" },
      { id: "f", code: "action_required" },
      { id: "x", code: "tool_unknown" },
    ]);
  });

  it("compile to the agent's system tool calls", () => {
    const body = compile(
      [
        { id: "t", type: "tool", toolId: "system:add_tag", action: "VIP" },
        {
          id: "r",
          type: "tool",
          toolId: "system:remove_tag",
          action: "New lead",
        },
        {
          id: "f",
          type: "tool",
          toolId: "system:save_customer_field",
          action: "budget",
        },
        {
          id: "s",
          type: "tool",
          toolId: "system:schedule_followup",
          text: "Remind them about the booking the day before.",
        },
        { id: "h", type: "tool", toolId: "system:handoff" },
        { id: "n", type: "tool", toolId: "system:notify_team" },
      ],
      ["Be kind."],
    );
    expect(body).toContain('1. Call `apply_customer_tag` with the tag "VIP".');
    expect(body).toContain(
      '2. Call `remove_customer_tag` with the tag "New lead".',
    );
    expect(body).toContain(
      '3. Call `set_customer_field` to save the customer\'s "budget" from what they told you.',
    );
    expect(body).toContain(
      "4. Call `schedule_followup` to follow up with the customer later. How: Remind them about the booking the day before.",
    );
    expect(body).toContain(
      '5. Hand the conversation to a person now: in this same reply, before you write to the customer, call `apply_customer_tag` with the name of the tag marked "(triggers handoff)" that fits best. Writing that staff will help does nothing without this call.',
    );
    expect(body).toContain(
      '6. Let the team know now: in this same reply, call `apply_customer_tag` with the name of the tag marked "(notifies the team)" that fits best, then go on helping the customer.',
    );
    expect(body).not.toContain("check the result against the Rules");
  });
});

describe("withoutSkillRules", () => {
  it("drops the Rules section a compiled body ends with", () => {
    const body = compileSkill({
      name: "T",
      guardrails: ["Be kind."],
      format: "STEPS",
      steps: [{ id: "a", type: "tell", text: "Hi" }],
      toolName: () => undefined,
    });
    expect(withoutSkillRules(body)).toBe(
      "# T\n\n## Steps\nFollow these steps in order, one at a time.\n1. Tell the customer, in your own words: Hi.",
    );
    expect(withoutSkillRules("no rules here")).toBe("no rules here");
  });
});
