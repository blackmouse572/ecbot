import { PolicyAbilityFactory, type RolePermission } from "@repo/auth";
import { describe, expect, it } from "vitest";

// A snapshot frozen before TOOL / CLIENT_CREDENTIAL existed: proves owner
// abilities do not depend on role.permissions keeping up with new subjects.
const staleOwnerPermissions: RolePermission[] = [
  { subject: "DASHBOARD", action: ["read"] },
];

describe("PolicyAbilityFactory workspace owners", () => {
  it("grants full abilities to a WORKSPACE_OWNER with an empty permission list", () => {
    const ability = PolicyAbilityFactory.createForMember([], "WORKSPACE_OWNER");

    expect(ability.can("manage", "all")).toBe(true);
    expect(ability.can("read", "CHATBOT")).toBe(true);
  });

  it("reaches newly added subjects on a stale owner snapshot", () => {
    const ability = PolicyAbilityFactory.createForMember(
      staleOwnerPermissions,
      "WORKSPACE_OWNER",
    );

    expect(ability.can("manage", "TOOL")).toBe(true);
    expect(ability.can("manage", "CLIENT_CREDENTIAL")).toBe(true);
  });

  it("grants full abilities to an owner with no role row via the owner flag", () => {
    const ability = PolicyAbilityFactory.createForUser([], "USER", true);

    expect(ability.can("manage", "all")).toBe(true);
    expect(ability.can("read", "CHATBOT")).toBe(true);
  });

  it("grants full abilities in the member branch via the owner flag", () => {
    const ability = PolicyAbilityFactory.createForMember(
      [],
      "WORKSPACE_MEMBER",
      true,
    );

    expect(ability.can("manage", "all")).toBe(true);
  });

  it("leaves non-owners unchanged", () => {
    const user = PolicyAbilityFactory.createForUser([], "USER");
    expect(user.can("read", "CHATBOT")).toBe(false);

    const member = PolicyAbilityFactory.createForMember(
      [{ subject: "CHATBOT", action: ["read"] }],
      "WORKSPACE_MEMBER",
    );
    expect(member.can("read", "CHATBOT")).toBe(true);
    expect(member.can("manage", "TOOL")).toBe(false);
  });

  it("keeps SUPER_ADMIN on full access", () => {
    const ability = PolicyAbilityFactory.createForUser([], "SUPER_ADMIN");

    expect(ability.can("manage", "all")).toBe(true);
  });
});
