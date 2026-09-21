import { AbilityBuilder, createMongoAbility } from "@casl/ability";
import {
  type AppAbility,
  type ENUM_POLICY_ROLE_TYPE,
  type PolicyAbility,
  type RolePermission,
} from "./types";

export class PolicyAbilityFactory {

  static createForUser(
    permissions: RolePermission[],
    roleType: ENUM_POLICY_ROLE_TYPE,
    isWorkspaceOwner: boolean = false,
  ): AppAbility {
    const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

    // Super admin and workspace owners can do everything. The owner check is
    // on the role type and the explicit flag — never on role.permissions,
    // which may be missing or a stale snapshot.
    if (
      roleType === "SUPER_ADMIN" ||
      roleType === "WORKSPACE_OWNER" ||
      isWorkspaceOwner
    ) {
      can("manage", "all");
      return build();
    }

    // Add permissions based on role permissions
    for (const permission of permissions) {
      for (const action of permission.action) {
        can(action, permission.subject);
      }
    }

    return build();
  }

  static createForMember(
    permissions: RolePermission[],
    roleType: ENUM_POLICY_ROLE_TYPE,
    isWorkspaceOwner: boolean = false,
  ): AppAbility {
    const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

    // Super admin and workspace owners can do everything. The owner check is
    // on the role type and the explicit flag — never on role.permissions,
    // which may be missing or a stale snapshot.
    if (
      roleType === "SUPER_ADMIN" ||
      roleType === "WORKSPACE_OWNER" ||
      isWorkspaceOwner
    ) {
      can("manage", "all");
      return build();
    }

    // Add permissions based on role permissions
    for (const permission of permissions) {
      for (const action of permission.action) {
        can(action, permission.subject);
      }
    }
    return build();
  }

  static handlerAbilities(
    userAbility: AppAbility,
    requiredAbilities: PolicyAbility[],
  ): boolean {
    return requiredAbilities.every((ability) =>
      ability.action.every((action) =>
        userAbility.can(action, ability.subject),
      ),
    );
  }
}
