import { describe, expect, it } from "vitest";
import { workspaceSettingsPath } from "./workspace-settings-path";

describe("workspaceSettingsPath", () => {
  it("points at the workspace settings home", () => {
    expect(workspaceSettingsPath("kunmart")).toBe(
      "/kunmart/settings/workspace",
    );
  });
});
