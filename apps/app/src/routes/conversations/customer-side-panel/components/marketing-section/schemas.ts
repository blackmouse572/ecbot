import {
  CUSTOMER_PERMISSIONS,
  CUSTOMER_STAGES,
} from "@/components/customer-marketing";
import { t } from "i18next";
import { z } from "zod/v4";

const startOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return today;
};

export const marketingEditSchema = z
  .object({
    stage: z.enum(CUSTOMER_STAGES),
    permission: z.enum(CUSTOMER_PERMISSIONS),
    permissionUntil: z.date().nullable(),
    hostile: z.boolean(),
    reason: z
      .string()
      .trim()
      .min(1, t("conversations.customer.panel.marketing.edit.reasonRequired"))
      .max(500),
  })
  .superRefine((value, ctx) => {
    if (value.permission !== "PAUSED") return;

    if (!value.permissionUntil || value.permissionUntil <= startOfToday()) {
      ctx.addIssue({
        code: "custom",
        path: ["permissionUntil"],
        message: t("conversations.customer.panel.marketing.edit.untilFuture"),
      });
    }
  });

export type MarketingEditFormData = z.infer<typeof marketingEditSchema>;
