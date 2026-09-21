/* eslint-disable @typescript-eslint/no-explicit-any */
import type { FieldPath, FieldValues, UseFormReturn } from "react-hook-form";
import { z } from "zod/v4";

export function partialFormValidation<TForm extends FieldValues>(
  form: UseFormReturn<TForm>,
  fields: FieldPath<any>[],
  schema: z.ZodSchema<any>,
) {
  form.clearErrors(fields as any);

  const values = fields.reduce(
    (acc, key) => {
      acc[key] = form.getValues(key as any);
      return acc;
    },
    {} as Record<string, unknown>,
  );

  const validationResult = schema.safeParse(values);

  if (!validationResult.success) {
    z.treeifyError(validationResult.error, (issue) => {
      form.setError(issue.path.join(".") as any, {
        type: issue.code,
        message: issue.message,
      });
    });
    return false;
  }

  return true;
}
