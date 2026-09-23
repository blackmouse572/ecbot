import { z } from "zod/v4";
import i18n from "@/i18n";
import { blankToUndefined } from "@/libs/validations";

const httpAuthSchema = z
  .object({
    type: z.enum(["bearer", "api_key", "basic", "none"]),
    placement: z.enum(["header", "query"]).optional(),
    paramName: z.string().optional(),
  })
  .optional();

const schemaPropTypeEnum = z.enum([
  "string",
  "number",
  "integer",
  "boolean",
  "array",
]);

const schemaRowSchema = z.object({
  key: z.string().min(1, i18n.t("tools.errors.schemaRowKeyRequired")),
  type: schemaPropTypeEnum,
  description: z
    .string()
    .min(1, i18n.t("tools.errors.schemaRowDescriptionRequired")),
  enum: z.array(z.string()).optional(),
  required: z.boolean().optional(),
});

export const createHttpToolSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().min(1),
  httpMethod: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  httpUrl: z.url(),
  inputSchemaRows: z.array(schemaRowSchema).optional().default([]),
  headers: z.record(z.string(), z.string()).optional(),
  auth: httpAuthSchema,
  credential: z.string().optional(),
  // Preprocessed so clearing the field means "unset" — without it an emptied
  // Timeout coerces to 0 and sticks on a `.positive()` error, and an emptied
  // Max retries silently submits 0.
  timeoutMs: z.preprocess(
    blankToUndefined,
    z.coerce.number().int().positive().optional(),
  ),
  maxRetries: z.preprocess(
    blankToUndefined,
    z.coerce.number().int().min(0).max(3).optional(),
  ),
});

/**
 * The same schema with the metadata relaxed. `name`/`description` are needed
 * to save a tool, not to issue its request, so the test panel validates
 * against this and an unnamed draft stays testable.
 */
export const httpToolTestSchema = createHttpToolSchema.extend({
  name: z.string(),
  description: z.string(),
});

export type HttpToolFormData = z.infer<typeof createHttpToolSchema>;
// What the fields hold before coercion — `useForm`'s TFieldValues.
export type HttpToolFormInput = z.input<typeof createHttpToolSchema>;

export const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
export const AUTH_TYPES = ["none", "bearer", "api_key", "basic"] as const;
export const AUTH_PLACEMENTS = ["header", "query"] as const;
