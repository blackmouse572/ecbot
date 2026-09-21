import { fireEvent, screen } from "@testing-library/react";
import { useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import {
  renderWithProviders,
  uiTestI18nResources,
} from "../../../../../test/i18n";
import { DataTableFilter, type Filter } from "./data-table-filter";

const countryFilter = (
  options: Array<{ label: string; value: string }>,
): Filter => ({
  key: "country",
  label: "Country",
  type: "select",
  options,
  multiple: false,
  searchable: true,
});

describe("DataTableFilter with async options", () => {
  it("renders the chip's value once options arrive after mount", () => {
    // Filters whose options come from a network call (a countries list, a
    // chatbot list) are empty on the first render. The active filter is seeded
    // from the URL at mount, so if the option list were snapshotted then, the
    // chip could never resolve its label — leaving a chip with no value, no
    // popover trigger and no remove button.
    const { rerender } = renderWithProviders(
      <DataTableFilter filters={[countryFilter([])]} />,
      { initialEntries: ["/?country=vn-id"] },
    );

    expect(screen.queryByText("Vietnam")).not.toBeInTheDocument();

    rerender(
      <DataTableFilter
        filters={[countryFilter([{ label: "Vietnam", value: "vn-id" }])]}
      />,
    );

    expect(screen.getByText("Vietnam")).toBeInTheDocument();
    // `is` is the operator label the chip renders next to a resolved value; its
    // absence is what tells you the chip has degraded to a dead label.
    expect(screen.getByText("is")).toBeInTheDocument();
  });
});

describe("DataTableFilter clear-all", () => {
  // Removing a single filter already resets the page (useSelectedParams deletes
  // `page`/`offset`). Clear-all took a different route through setSearchParams
  // and dropped only the filter keys, so clearing from page 3 left `page=3` on a
  // now much shorter list — an empty page with no way to tell why.
  function ClearAllHarness({ prefix }: { prefix?: string }) {
    const location = useLocation();
    return (
      <>
        <DataTableFilter
          filters={[countryFilter([{ label: "Vietnam", value: "vn-id" }])]}
          prefix={prefix}
        />
        <span data-testid="search">{location.search}</span>
      </>
    );
  }

  const clearAll = () =>
    fireEvent.click(
      screen.getByRole("button", {
        name: uiTestI18nResources.filters.clearAll,
      }),
    );

  it("resets the page when every filter is cleared", () => {
    renderWithProviders(<ClearAllHarness />, {
      initialEntries: ["/?country=vn-id&page=3&offset=40"],
    });

    clearAll();

    const params = new URLSearchParams(
      screen.getByTestId("search").textContent ?? "",
    );
    expect(params.get("country")).toBeNull();
    expect(params.get("page")).toBeNull();
    expect(params.get("offset")).toBeNull();
  });

  // A prefixed table (password history is rendered with prefix="ph" inside the
  // user detail page) namespaces every param. Deleting the bare `page`/`offset`
  // would leave the prefixed ones behind — the original bug, surviving wherever
  // two tables share a URL.
  it("resets the prefixed page when the table is namespaced", () => {
    renderWithProviders(<ClearAllHarness prefix="ph" />, {
      initialEntries: ["/?ph_country=vn-id&ph_page=3&ph_offset=40"],
    });

    clearAll();

    const params = new URLSearchParams(
      screen.getByTestId("search").textContent ?? "",
    );
    expect(params.get("ph_country")).toBeNull();
    expect(params.get("ph_page")).toBeNull();
    expect(params.get("ph_offset")).toBeNull();
  });

  it("leaves another table's params alone", () => {
    renderWithProviders(<ClearAllHarness prefix="ph" />, {
      initialEntries: ["/?ph_country=vn-id&ph_page=3&page=2&country=us-id"],
    });

    clearAll();

    const params = new URLSearchParams(
      screen.getByTestId("search").textContent ?? "",
    );
    expect(params.get("ph_page")).toBeNull();
    expect(params.get("page")).toBe("2");
    expect(params.get("country")).toBe("us-id");
  });
});
