import { describe, expect, it } from "vitest";
import { defaultEnabledActions, isActionEnabled } from "./mcp-action-state";

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
