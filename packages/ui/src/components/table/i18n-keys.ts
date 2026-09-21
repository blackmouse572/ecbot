/**
 * Every translation key the table components render, including the
 * NoRecords/NoResults keys they render via `@repo/ui/common-components`.
 *
 * @repo/ui resolves these against the *consumer app's* i18next instance, and a
 * missing key renders as the raw key string with no error and no warning.
 * Every consumer app must therefore assert its bundles against this list in its
 * own i18n test — see `apps/admin/src/i18n/i18n.test.ts` for the pattern.
 *
 * `i18n-keys.test.ts` keeps this list in step with the source, so adding a
 * `t()` call to a table component fails there until the key is declared here.
 *
 * `apps/app` became a consumer too (`DataTable` from `./data-table-v4`, used by
 * role-permission-grid.tsx) but, unlike `apps/admin`, has no i18n test asserting
 * its bundles against this list — its `en.json`/`vi.json` already happen to
 * carry every key that component renders, but nothing guards against drift.
 * Add an `apps/app` equivalent of `apps/admin/src/i18n/i18n.test.ts` before
 * this package picks up a table component `apps/app` doesn't already localize.
 */
export const UI_TABLE_I18N_KEYS = [
  "actions.clearAll",
  "filters.searchLabel",
  "filters.sortLabel",
  "general.search",
  "general.is",
  "general.of",
  "general.pages",
  "general.prev",
  "general.next",
  "general.results",
  "general.countSelected",
  "general.ascending",
  "general.descending",
  "general.orderBy",
  "general.noResultsTitle",
  "general.noResultsMessage",
  "general.noRecordsTitle",
  "general.noRecordsMessage",
  "fields.createdAt",
  "fields.date",
  "fields.email",
  "fields.name",
  "filters.addFilter",
  "filters.clearAll",
  "filters.date.today",
  "filters.date.custom",
  "filters.date.from",
  "filters.date.to",
  "filters.date.lastSevenDays",
  "filters.date.lastThirtyDays",
  "filters.date.lastNinetyDays",
  "filters.date.lastTwelveMonths",
  "filters.compare.exact",
  "filters.compare.range",
  "filters.compare.greaterThan",
  "filters.compare.lessThan",
  "filters.compare.greaterThanLabel",
  "filters.compare.lessThanLabel",
  "filters.compare.andLabel",
] as const;

export type UiTableI18nKey = (typeof UI_TABLE_I18N_KEYS)[number];
