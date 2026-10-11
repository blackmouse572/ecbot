import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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

  it("renders a link action that points to the given route", () => {
    renderWithProviders(
      <NoRecords action={{ to: "create", label: "Create agent" }} />,
    );

    expect(screen.getByRole("link", { name: "Create agent" })).toHaveAttribute(
      "href",
      "/create",
    );
  });

  it("renders a button action that calls onClick", () => {
    const onClick = vi.fn();
    renderWithProviders(
      <NoRecords action={{ onClick, label: "Invite member" }} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Invite member" }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("renders the given icon", () => {
    renderWithProviders(<NoRecords icon={<svg data-testid="custom-icon" />} />);

    expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
  });
});
