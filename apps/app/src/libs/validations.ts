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

/**
 * Maps a cleared input back to "unset" before zod coerces it.
 *
 * `Number("") === 0`, so a bare `z.coerce.number()` turns an emptied field
 * into a real `0`: `.optional()` never sees `undefined` and silently submits
 * zero, `.default()` never fires, and `.positive()` fails with no way back to
 * empty. Preprocess blanks to `undefined` so those modifiers work as written.
 */
export const blankToUndefined = (value: unknown) =>
  value === "" || value === null ? undefined : value;
