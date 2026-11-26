import { t } from "i18next";
import { z as zod } from "zod/v4";
import {
  MARKETING_DRAFT_TONES,
  MARKETING_SEND_EXCLUDED_MAX,
  MARKETING_SEND_MODES,
  MARKETING_SEND_TEXT_MAX,
  MARKETING_SETTINGS_LIMITS,
} from "./constants";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export const marketingSendFormSchema = zod.object({
  offer: zod.string().trim().max(500),
  text: zod
    .string()
    .trim()
    .min(1, t("marketing.send.errors.text"))
    .max(MARKETING_SEND_TEXT_MAX),
  tone: zod.enum(MARKETING_DRAFT_TONES),
  mode: zod.enum(MARKETING_SEND_MODES),
  excludedCustomerIds: zod.array(zod.string()).max(
    MARKETING_SEND_EXCLUDED_MAX,
    t("marketing.send.customers.tooMany", {
      max: MARKETING_SEND_EXCLUDED_MAX,
    }),
  ),
});

export type MarketingSendFormData = zod.infer<typeof marketingSendFormSchema>;

const count = (max: number) =>
  zod
    .number(t("marketing.settings.errors.number"))
    .int(t("marketing.settings.errors.number"))
    .min(1, t("marketing.settings.errors.number"))
    .max(max, t("marketing.settings.errors.max", { max }));

export const marketingSettingsFormSchema = zod
  .object({
    sendFrom: zod.string().regex(TIME),
    sendTo: zod.string().regex(TIME),
    maxPer30Days: count(MARKETING_SETTINGS_LIMITS.maxPer30Days),
    restAfter: count(MARKETING_SETTINGS_LIMITS.restAfter),
    restDays: count(MARKETING_SETTINGS_LIMITS.restDays),
    stopKeywords: zod
      .array(zod.string().trim().min(1).max(30))
      .max(MARKETING_SETTINGS_LIMITS.stopKeywords),
    stopReplyEnabled: zod.boolean(),
    stopReply: zod.string().trim().max(500),
  })
  // "HH:mm" sorts as text the way it sorts as time.
  .refine((data) => data.sendFrom < data.sendTo, {
    path: ["sendTo"],
    message: t("marketing.settings.errors.hours"),
  });

export type MarketingSettingsFormData = zod.infer<
  typeof marketingSettingsFormSchema
>;
