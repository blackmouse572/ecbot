import type { InferSubjects, MongoAbility } from "@casl/ability";
import type { RoleGetResponseDto } from "@repo/client";

export type RolePermission = RoleGetResponseDto["permissions"][number];
export type ENUM_POLICY_ACTION = RolePermission["action"][number];
export type ENUM_POLICY_SUBJECT = RolePermission["subject"];

export type ENUM_POLICY_ROLE_TYPE = RoleGetResponseDto["type"];

export type Subjects = InferSubjects<ENUM_POLICY_SUBJECT> | "all";

export type AppAbility = MongoAbility<[ENUM_POLICY_ACTION, Subjects]>;

export interface PolicyAbility {
  subject: ENUM_POLICY_SUBJECT;
  action: ENUM_POLICY_ACTION[];
}
