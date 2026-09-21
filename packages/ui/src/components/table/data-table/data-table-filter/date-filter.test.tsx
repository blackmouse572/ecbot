import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import {
  renderWithProviders,
  uiTestI18nResources,
} from "../../../../../test/i18n";
import { DataTableFilterContext } from "./context";
import { DateFilter } from "./date-filter";

const filter = { key: "createdAt", label: "Created at" };

function Harness({
  children,
  onSearch,
}: {
  children: ReactNode;
  onSearch: (search: string) => void;
}) {
  const location = useLocation();
  onSearch(location.search);
  return <>{children}</>;
}

type RenderOptions = {
  prefix?: string;
  initialEntries?: string[];
  openOnMount?: boolean;
};

function renderDateFilter({
  prefix,
  initialEntries = ["/"],
  openOnMount = true,
}: RenderOptions = {}) {
  const removeFilter = vi.fn();
  let search = "";

  const { container } = renderWithProviders(
    <DataTableFilterContext.Provider
      value={{ removeFilter, removeAllFilters: vi.fn() }}
    >
      <Harness onSearch={(s) => (search = s)}>
        <DateFilter
          filter={filter}
          prefix={prefix}
          openOnMount={openOnMount}
        />
      </Harness>
    </DataTableFilterContext.Provider>,
    { initialEntries },
  );

  return {
    removeFilter,
    urlSearch: () => search,
    user: userEvent.setup(),
    container,
  };
}

// Same reasoning as StringFilter: the remove (X) button is the chip's only
// plain <button> outside the popover Content, so it must be exercised closed.
const removeButton = (container: HTMLElement) =>
  container.querySelector(".bg-ui-bg-field button") as HTMLButtonElement;

const preset = (name: string) => screen.getByRole("button", { name });

describe("DateFilter", () => {
  it("writes a preset's date comparison to the URL as JSON", async () => {
    const { urlSearch, user } = renderDateFilter();

    await user.click(preset(uiTestI18nResources.filters.date.today));

    await waitFor(() => {
      const decoded = decodeURIComponent(urlSearch());
      expect(decoded).toContain("createdAt=");
      expect(decoded).toContain('"$gte"');
    });
  });

  it("switches the URL value when a different preset is picked", async () => {
    const { urlSearch, user } = renderDateFilter();

    await user.click(preset(uiTestI18nResources.filters.date.today));
    await waitFor(() => expect(urlSearch()).toContain("createdAt="));
    const afterToday = urlSearch();

    await user.click(preset(uiTestI18nResources.filters.date.lastSevenDays));

    await waitFor(() => expect(urlSearch()).not.toBe(afterToday));
    expect(urlSearch()).toContain("createdAt=");
  });

  it("namespaces the param when a prefix is given", async () => {
    const { urlSearch, user } = renderDateFilter({ prefix: "ph" });

    await user.click(preset(uiTestI18nResources.filters.date.today));

    await waitFor(() => expect(urlSearch()).toContain("ph_createdAt="));
    expect(urlSearch()).not.toMatch(/(?<!ph_)createdAt=/);
  });

  it("reveals the custom date fields when Custom is picked", async () => {
    const { urlSearch, user } = renderDateFilter();

    await user.click(preset(uiTestI18nResources.filters.date.custom));

    expect(urlSearch()).not.toContain("createdAt=");
    expect(
      screen.getByText(uiTestI18nResources.filters.date.from),
    ).toBeInTheDocument();
    expect(
      screen.getByText(uiTestI18nResources.filters.date.to),
    ).toBeInTheDocument();
  });

  // Regression: picking a preset then Custom left the preset's value in the
  // URL. Root cause was NOT the delete() call (it always computed correctly)
  // — it's that mounting the "From" DatePicker with `value={customStartValue}`
  // (still the preset's date, since currentDateComparison hasn't caught up to
  // the just-issued delete on this render) fires `onChange` once on mount,
  // and that re-add clobbered the delete in the same batch.
  it("clears the preset's value when Custom is picked afterward", async () => {
    const { urlSearch, user } = renderDateFilter();

    await user.click(preset(uiTestI18nResources.filters.date.today));
    await waitFor(() => expect(urlSearch()).toContain("createdAt="));

    await user.click(preset(uiTestI18nResources.filters.date.custom));

    await waitFor(() => expect(urlSearch()).not.toContain("createdAt="));
  });

  it("removes the param and notifies removeFilter when the chip's X is clicked", async () => {
    const { urlSearch, removeFilter, user, container } = renderDateFilter({
      initialEntries: [
        `/?createdAt=${encodeURIComponent(JSON.stringify({ $gte: "2026-01-01T00:00:00.000Z" }))}`,
      ],
      openOnMount: false,
    });

    await user.click(removeButton(container));

    expect(urlSearch()).not.toContain("createdAt");
    expect(removeFilter).toHaveBeenCalledWith("createdAt");
  });
});
