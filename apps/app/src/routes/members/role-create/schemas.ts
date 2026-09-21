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
        subject: z.enum(["CHATBOT", "RAG", "KNOWLEDGE_BASE", "CUSTOMER"]),
        action: z.array(
          z.enum(["manage", "read", "create", "update", "delete"]),
        ),
      }),
    ),
  });

export type RoleFormData = z.infer<ReturnType<typeof createRoleSchema>>;

export type RoleCreateFormData = RoleFormData;
