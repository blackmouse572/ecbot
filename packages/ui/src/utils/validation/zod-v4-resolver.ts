import type {
  FieldErrors,
  FieldValues,
  Resolver,
  ResolverOptions,
  ResolverResult,
} from "react-hook-form";
import type { z } from "zod/v4";

/**
 * `@hookform/resolvers@3.4.2`'s built-in `zodResolver` was written against
 * zod v3 — it detects a ZodError by checking `null != err.errors`, but zod
 * v4 renamed that field to `issues`. Result: every zod-v4 validation error
 * is re-thrown out of the resolver, RHF logs it to the console, and no
 * field-level errors are surfaced via `formState.errors`. So `Form.ErrorMessage`
 * renders nothing.
 *
 * `@hookform/resolvers@5.x` handles zod v4 properly (it branches on `_zod` and
 * reads `issues`), but it requires `react-hook-form@^7.55` and this repo is on
 * 7.49 — so adopting it means a RHF upgrade across every form, not a one-line
 * dependency bump. Until someone takes that on, this shim is the working
 * answer rather than a stopgap. It maps zod v4 issues onto RHF's nested error
 * shape the same way the upstream resolver does.
 */
export const zodV4Resolver =
  <TSchema extends z.ZodType, TFieldValues extends FieldValues = FieldValues>(
    schema: TSchema,
  ): Resolver<TFieldValues> =>
  async (
    values: TFieldValues,
    _ctx: unknown,
    _options: ResolverOptions<TFieldValues>,
  ): Promise<ResolverResult<TFieldValues>> => {
    const result = await schema.safeParseAsync(values);
    if (result.success) {
      return { values: result.data as TFieldValues, errors: {} };
    }

    const errors: FieldErrors<TFieldValues> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.map(String);
      if (path.length === 0) continue;
      const leaf = path[path.length - 1] as string;
      let cursor: Record<string, unknown> = errors as Record<string, unknown>;
      for (let i = 0; i < path.length - 1; i++) {
        const segment = path[i] as string;
        const existing = cursor[segment];
        if (!existing || typeof existing !== "object") {
          cursor[segment] = {};
        }
        cursor = cursor[segment] as Record<string, unknown>;
      }
      // Only set the first error per leaf path, matching @hookform/resolvers
      // default ("firstError") criteria mode.
      if (!cursor[leaf]) {
        cursor[leaf] = { type: issue.code, message: issue.message };
      }
    }

    return { values: {} as TFieldValues, errors };
  };
