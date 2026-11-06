import type { TFunction } from "i18next";
import { z } from "zod/v4";

export const createRoleSchema = (t: TFunction<"translation", undefined>) =>
  z.object({
    name: z
      .string()
      .min(1, t("errors.role.nameRequired", "Role name is required")),
    description: z.string().optional(),
    permissions: z.array(
      z.object({
        // Mirrors the API's ALLOWED_WORKSPACE_POLICY_SUBJECT, so a role that
        // holds a subject the picker does not show still saves unchanged.
        subject: z.enum([
          "ACTIVITY",
          "UTILITIES",
          "DASHBOARD",
          "WORKSPACE",
          "USER",
          "MEMBER",
          "CHATBOT",
          "RAG",
          "KNOWLEDGE_BASE",
          "TOOL",
          "CUSTOMER",
          "CUSTOMER_DATA",
          "CLIENT_CREDENTIAL",
          "SKILL",
          "TOKEN_USAGE",
        ]),
        action: z.array(
          z.enum(["manage", "read", "create", "update", "delete"]),
        ),
      }),
    ),
  });

export type RoleFormData = z.infer<ReturnType<typeof createRoleSchema>>;

export type RoleCreateFormData = RoleFormData;
