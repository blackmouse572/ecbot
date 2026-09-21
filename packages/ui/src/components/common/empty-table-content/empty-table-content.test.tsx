import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  renderWithProviders,
  uiTestI18nResources,
} from "../../../../test/i18n";
import { NoRecords, NoResults } from "./empty-table-content";

// Smoke test for the packages/ui vitest harness itself: it exercises jsdom, the
// JSX transform, react-i18next and @medusajs/ui through a component that
// already lives here.
describe("empty-table-content", () => {
  it("renders the default no-results copy from the app's i18n bundle", () => {
    renderWithProviders(<NoResults />);

    expect(
      screen.getByText(uiTestI18nResources.general.noResultsTitle),
    ).toBeInTheDocument();
  });

  it("renders the default no-records copy", () => {
    renderWithProviders(<NoRecords />);

    expect(
      screen.getByText(uiTestI18nResources.general.noRecordsTitle),
    ).toBeInTheDocument();
  });
});
