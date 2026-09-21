import { TooltipProvider } from "@medusajs/ui";
import {
  render,
  type RenderOptions,
  type RenderResult,
} from "@testing-library/react";
import i18next, { type i18n as I18n } from "i18next";
import type { ReactElement, ReactNode } from "react";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { MemoryRouter } from "react-router-dom";

/**
 * The i18n key contract this package's components render. Every consumer app
 * must ship these keys — @repo/ui resolves them against the app's own i18next
 * instance, and a missing key renders as the raw key string with no error.
 *
 * Values are deliberately distinct from the keys so a test asserting on a value
 * fails loudly if the lookup silently falls through.
 */
export const uiTestI18nResources = {
  actions: {
    clearAll: "Clear all",
  },
  general: {
    search: "Search",
    is: "is",
    of: "of",
    pages: "pages",
    prev: "Prev",
    next: "Next",
    results: "results",
    countSelected: "{{count}} selected",
    ascending: "Ascending",
    descending: "Descending",
    orderBy: "Order by",
    noResultsTitle: "No results",
    noResultsMessage: "Try a different search",
    noRecordsTitle: "No records",
    noRecordsMessage: "Nothing here yet",
  },
  fields: {
    createdAt: "Created at",
    date: "Date",
    email: "Email",
    name: "Name",
  },
  filters: {
    addFilter: "Add filter",
    clearAll: "Clear all",
    searchLabel: "Search",
    sortLabel: "Sort",
    date: {
      today: "Today",
      custom: "Custom",
      from: "From",
      to: "To",
      lastSevenDays: "Last 7 days",
      lastThirtyDays: "Last 30 days",
      lastNinetyDays: "Last 90 days",
      lastTwelveMonths: "Last 12 months",
    },
    compare: {
      exact: "Exact",
      range: "Range",
      greaterThan: "Greater than",
      lessThan: "Less than",
      greaterThanLabel: "greater than {{value}}",
      lessThanLabel: "less than {{value}}",
      andLabel: "and",
    },
  },
} as const;

export function createTestI18n(lng: string = "en"): I18n {
  const instance = i18next.createInstance();

  instance.use(initReactI18next).init({
    lng,
    fallbackLng: "en",
    // Both languages get the same strings: these tests assert on wiring, not on
    // translation quality. `useDate` tests assert on locale-formatted dates
    // instead, which is what actually differs per language.
    resources: {
      en: { translation: uiTestI18nResources },
      vi: { translation: uiTestI18nResources },
    },
    // Defensive: i18next otherwise finishes init on a deferred macrotask, so
    // `isInitialized` can be false at first render and `useTranslation` would
    // suspend (useSuspense defaults to true) with no boundary above it. This
    // makes init synchronous. Not tied to a flake reproduced here — the suite
    // is green either way locally — but the race is real in principle and CI
    // is slower, so the cheap guarantee is worth keeping.
    initImmediate: false,
    interpolation: { escapeValue: false },
  });

  return instance;
}

type ProviderOptions = Omit<RenderOptions, "wrapper"> & {
  i18n?: I18n;
  /** Initial URL(s) for the MemoryRouter, e.g. `["/?page=2"]`. */
  initialEntries?: string[];
};

/**
 * Renders inside the three contexts every table component needs: an i18next
 * instance, @medusajs/ui's TooltipProvider, and a router (the data-table reads
 * and writes `useSearchParams`).
 */
export function renderWithProviders(
  ui: ReactElement,
  { i18n, initialEntries = ["/"], ...options }: ProviderOptions = {},
): RenderResult & { i18n: I18n } {
  const instance = i18n ?? createTestI18n();

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <I18nextProvider i18n={instance}>
      <TooltipProvider>
        <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
      </TooltipProvider>
    </I18nextProvider>
  );

  return { ...render(ui, { wrapper: Wrapper, ...options }), i18n: instance };
}
