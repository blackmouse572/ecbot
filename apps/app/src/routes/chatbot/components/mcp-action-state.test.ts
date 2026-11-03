import { describe, expect, it } from "vitest";
import {
  defaultEnabledActions,
  enabledActionsPromptTokens,
  isActionEnabled,
} from "./mcp-action-state";

const actions = [
  { name: "list_orders", destructive: false },
  { name: "delete_all_orders", destructive: true },
];

// #177: destructive actions start switched off.
describe("mcp action state", () => {
  it("treats a link with no list as everything but destructive actions", () => {
    expect(isActionEnabled(actions[0], null)).toBe(true);
    expect(isActionEnabled(actions[1], null)).toBe(false);
  });

  it("follows an explicit list", () => {
    expect(isActionEnabled(actions[1], ["delete_all_orders"])).toBe(true);
    expect(isActionEnabled(actions[0], ["delete_all_orders"])).toBe(false);
  });

  it("expands the default to the safe actions before the first toggle", () => {
    expect(defaultEnabledActions(actions)).toEqual(["list_orders"]);
  });
});

// Every enabled action's definition is sent with every model call, so a big
// toolkit (Google Sheets: 58 actions) costs tens of thousands of tokens per
// message before the customer has said anything.
describe("prompt cost of enabled actions", () => {
  const schema = { type: "object", properties: { id: { type: "string" } } };
  const big = [
    { name: "get_rows", description: "Read rows.", inputSchema: schema },
    {
      name: "delete_rows",
      description: "Delete rows.",
      inputSchema: schema,
      destructive: true,
    },
  ];
  // About 4 characters a token: get_rows is 116 characters, delete_rows 121.
  const getRowsTokens = 29;
  const bothTokens = 29 + 31;

  it("counts only the actions that are on", () => {
    expect(enabledActionsPromptTokens(big, null)).toBe(getRowsTokens);
    expect(enabledActionsPromptTokens(big, [])).toBe(0);
  });

  it("adds up every action turned on", () => {
    expect(enabledActionsPromptTokens(big, ["get_rows", "delete_rows"])).toBe(
      bothTokens,
    );
  });
});
