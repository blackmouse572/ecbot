import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  renderWithProviders,
  uiTestI18nResources,
} from "../../../../../../test/i18n";
import { CreatedAtCell, CreatedAtHeader } from "./created-at-cell";

// The cell renders relative-vs-absolute off `Date.now()` at render time with a
// 1s window, so a slow render on a loaded CI box would flip the assertion.
// Freeze the clock instead of racing it.
const NOW = new Date(2026, 6, 7, 12, 0, 0);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("CreatedAtCell", () => {
  it("renders a relative date within the cell's 1s maxTime window", () => {
    renderWithProviders(<CreatedAtCell date={new Date(NOW.getTime() - 500)} />);

    expect(screen.getByText(/less than a minute/)).toBeInTheDocument();
  });

  it("renders an absolute date past the maxTime window", () => {
    renderWithProviders(
      <CreatedAtCell date={new Date(2026, 6, 7, 10, 0, 0)} />,
    );

    expect(screen.getByText("Jul 7, 2026")).toBeInTheDocument();
  });

  it("accepts an ISO string as well as a Date", () => {
    renderWithProviders(<CreatedAtCell date="2026-07-05T10:00:00.000Z" />);

    // Matched on shape, not on an exact day: the runner's timezone is not
    // pinned, so this instant lands on Jul 4, 5 or 6 depending on the offset.
    expect(screen.getByText(/^Jul \d{1,2}, 2026$/)).toBeInTheDocument();
  });

  it("falls back to the placeholder when there is no date", () => {
    renderWithProviders(<CreatedAtCell date={undefined} />);

    expect(screen.getByText("-")).toBeInTheDocument();
  });

  // `new Date("nonsense")` is an Invalid Date, which is truthy — so a plain
  // null-check lets it through and date-fns throws RangeError out of render,
  // taking down the whole table for one bad row.
  it("falls back to the placeholder for an unparseable date string", () => {
    expect(() =>
      renderWithProviders(<CreatedAtCell date="0000-00-00" />),
    ).not.toThrow();

    expect(screen.getByText("-")).toBeInTheDocument();
  });
});

describe("CreatedAtHeader", () => {
  it("renders the translated column label", () => {
    renderWithProviders(<CreatedAtHeader />);

    expect(
      screen.getByText(uiTestI18nResources.fields.createdAt),
    ).toBeInTheDocument();
  });
});
