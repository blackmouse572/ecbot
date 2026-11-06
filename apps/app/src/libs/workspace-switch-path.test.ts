import { describe, expect, it } from "vitest";
import { switchWorkspacePath } from "./workspace-switch-path";

describe("switchWorkspacePath", () => {
  it.each([
    ["/a/chatbot/123", "/b/chatbot"],
    ["/a/chatbot", "/b/chatbot"],
    ["/a/conversations/42/messages", "/b/conversations"],
    ["/a/settings/members/9", "/b/settings/members"],
    ["/a/settings/client-credentials", "/b/settings/client-credentials"],
    ["/a/settings", "/b/settings"],
    ["/a", "/b"],
    ["/settings/profile", "/b"],
  ])("%s -> %s", (from, to) => {
    expect(switchWorkspacePath(from, "a", "b")).toBe(to);
  });
});
