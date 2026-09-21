/**
 * Parse a cell's date prop, returning `undefined` for anything unusable.
 *
 * `new Date("nonsense")` yields an Invalid Date, which is **truthy** — so a
 * plain falsy check lets it through and date-fns then throws `RangeError:
 * Invalid time value` out of render, taking down the whole table for one bad
 * row. These cells are fed arbitrary API fields, so they validate rather than
 * trust.
 */
export function parseCellDate(
  value: Date | string | null | undefined,
): Date | undefined {
  if (!value) {
    return undefined;
  }

  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime()) ? undefined : date;
}
