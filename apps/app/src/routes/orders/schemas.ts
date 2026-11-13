import { t } from "i18next";
import { z as zod } from "zod/v4";
import { ORDER_FORM_STATUSES } from "./constants";

/** A group picked from the list (id), or a new name the form creates on save. */
const groupChoice = zod
  .object({ id: zod.string().optional(), name: zod.string() })
  .nullable();

export const orderItemSchema = zod.object({
  name: zod.string().trim().min(1, t("orders.form.errors.itemName")).max(255),
  group: groupChoice,
  quantity: zod
    .number(t("orders.form.errors.quantity"))
    .int(t("orders.form.errors.quantity"))
    .min(1, t("orders.form.errors.quantity")),
  unitPrice: zod.number().int().min(0).nullable(),
});

export const orderFormSchema = zod
  .object({
    customerId: zod.string().min(1, t("orders.form.errors.customer")),
    items: zod.array(orderItemSchema).max(100),
    /** Set only when the shop typed a total other than the items' sum. */
    customTotal: zod.number().int().min(0).nullable(),
    code: zod.string().trim().max(64),
    orderedAt: zod.date(t("orders.form.errors.orderedAt")),
    status: zod.enum(ORDER_FORM_STATUSES),
    note: zod.string().trim().max(2000),
  })
  .refine((value) => value.items.length > 0 || value.customTotal !== null, {
    path: ["items"],
    message: t("orders.form.errors.items"),
  });

export type OrderItemFormData = zod.infer<typeof orderItemSchema>;

export type OrderFormData = zod.infer<typeof orderFormSchema>;

export const productGroupFormSchema = zod.object({
  name: zod
    .string()
    .trim()
    .min(1, t("orders.groups.form.errors.name"))
    .max(120),
  defaultRepurchaseDays: zod
    .number(t("orders.groups.form.errors.days"))
    .int(t("orders.groups.form.errors.days"))
    .min(1, t("orders.groups.form.errors.days"))
    .max(730, t("orders.groups.form.errors.days"))
    .nullable(),
});

export type ProductGroupFormData = zod.infer<typeof productGroupFormSchema>;

/** Where Thêm đơn returns to when opened from another page: a path in the app. */
export const backPathSchema = zod.string().startsWith("/");
