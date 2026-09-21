import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import {
  renderWithProviders,
  uiTestI18nResources,
} from "../../../../../test/i18n";
import { DataTableFilterContext } from "./context";
import { SelectFilter } from "./select-filter";

type Option = {
  label: string;
  value: unknown;
  renderItem?: () => ReactNode;
};

const OPTIONS: Option[] = [
  { label: "Sign-up", value: "SIGN_UP" },
  { label: "Forgot", value: "FORGOT" },
  { label: "Temporary", value: "TEMPORARY" },
  { label: "Change", value: "CHANGE" },
];

const filter = { key: "type", label: "Type" };

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
  multiple?: boolean;
  searchable?: boolean;
  openOnMount?: boolean;
  options?: Option[];
  initialEntries?: string[];
};

function renderSelectFilter({
  multiple = false,
  searchable = false,
  openOnMount = true,
  options = OPTIONS,
  initialEntries = ["/"],
}: RenderOptions = {}) {
  const removeFilter = vi.fn();
  let search = "";

  renderWithProviders(
    <DataTableFilterContext.Provider
      value={{ removeFilter, removeAllFilters: vi.fn() }}
    >
      <Harness onSearch={(s) => (search = s)}>
        <SelectFilter
          filter={filter}
          options={options}
          multiple={multiple}
          searchable={searchable}
          openOnMount={openOnMount}
        />
      </Harness>
    </DataTableFilterContext.Provider>,
    { initialEntries },
  );

  return { removeFilter, urlSearch: () => search, user: userEvent.setup() };
}

// `hidden: true` throughout: Radix keeps the popper wrapper
// `visibility: hidden` until floating-ui positions it, and jsdom has no layout,
// so it never becomes "visible" here. The options are in the DOM regardless.
//
// Individual options are found by their label text and then walked up to the
// item element: the accessible *name* computes to empty inside that hidden
// subtree, so a name-based query would find nothing.
const options = () => screen.queryAllByRole("option", { hidden: true });

const option = (label: string) => {
  // Scoped to the list: FilterChip renders the selected labels as text as well,
  // so an unscoped getByText matches twice as soon as something is selected.
  const list = screen.getByRole("listbox", { hidden: true });
  const item = within(list).getByText(label).closest("[cmdk-item]");
  if (!item) {
    throw new Error(`"${label}" is rendered but not inside a cmdk item`);
  }
  return item as HTMLElement;
};

describe("SelectFilter", () => {
  // The bug this file exists for: the popover opened as a blank box with no
  // options and not even the empty-state text, because the option list was
  // rendered through a virtualizer that measured a zero-height container.
  it("renders every option when it opens on mount", async () => {
    renderSelectFilter();

    await waitFor(() => expect(options()).toHaveLength(OPTIONS.length));

    for (const { label } of OPTIONS) {
      expect(option(label)).toBeInTheDocument();
    }
  });

  it("writes the chosen option to the URL", async () => {
    const { urlSearch, user } = renderSelectFilter();

    await waitFor(() => expect(options()).not.toHaveLength(0));
    await user.click(option("Forgot"));

    await waitFor(() => expect(urlSearch()).toContain("type=FORGOT"));
  });

  it("replaces the value when single-select", async () => {
    const { urlSearch, user } = renderSelectFilter({
      initialEntries: ["/?type=FORGOT"],
    });

    await waitFor(() => expect(options()).not.toHaveLength(0));
    await user.click(option("Change"));

    await waitFor(() => expect(urlSearch()).toContain("type=CHANGE"));
    expect(urlSearch()).not.toContain("FORGOT");
  });

  it("accumulates values when multiple", async () => {
    const { urlSearch, user } = renderSelectFilter({
      multiple: true,
      initialEntries: ["/?type=FORGOT"],
    });

    await waitFor(() => expect(options()).not.toHaveLength(0));
    await user.click(option("Change"));

    await waitFor(() => expect(urlSearch()).toContain("CHANGE"));
    expect(urlSearch()).toContain("FORGOT");
  });

  it("removes one value from a multi-select without disturbing the rest", async () => {
    const { urlSearch, user } = renderSelectFilter({
      multiple: true,
      initialEntries: ["/?type=FORGOT,CHANGE"],
    });

    await waitFor(() => expect(options()).not.toHaveLength(0));
    await user.click(option("Forgot"));

    await waitFor(() => expect(urlSearch()).not.toContain("FORGOT"));
    expect(urlSearch()).toContain("type=CHANGE");
  });

  it("drops the param entirely when the last value is deselected", async () => {
    // A dangling `type=` would be forwarded as an empty filter rather than as
    // "no filter", so the key has to go, not just its value.
    const { urlSearch, user } = renderSelectFilter({
      multiple: true,
      initialEntries: ["/?type=FORGOT"],
    });

    await waitFor(() => expect(options()).not.toHaveLength(0));
    await user.click(option("Forgot"));

    await waitFor(() => expect(urlSearch()).not.toContain("type"));
  });

  it("searches by the visible label, not the underlying value", async () => {
    const { user } = renderSelectFilter({
      searchable: true,
      options: [
        { label: "Olivia Chen", value: "3f1c9a2e-0000-4000-8000-000000000001" },
        { label: "Marcus Webb", value: "8b7d4f6a-0000-4000-8000-000000000002" },
      ],
    });

    await waitFor(() => expect(options()).not.toHaveLength(0));
    await user.type(screen.getByPlaceholderText("Search"), "Olivia");

    await waitFor(() => expect(options()).toHaveLength(1));
    expect(option("Olivia Chen")).toBeInTheDocument();
  });

  // Command.List is the only thing that registers items with cmdk. Without it
  // getValidItems() returns [] forever, so nothing is ever marked active and
  // both the `aria-selected:` styling and keyboard navigation are dead.
  it("marks the first option active, proving cmdk registered the items", async () => {
    renderSelectFilter();

    await waitFor(() => expect(options()).not.toHaveLength(0));

    expect(options()[0]).toHaveAttribute("aria-selected", "true");
  });

  it("selects with the keyboard when the search input holds focus", async () => {
    const { urlSearch, user } = renderSelectFilter({ searchable: true });

    await waitFor(() => expect(options()).not.toHaveLength(0));
    screen.getByPlaceholderText("Search").focus();
    await user.keyboard("{ArrowDown}{Enter}");

    await waitFor(() => expect(urlSearch()).toContain("type="));
  });

  it("filters the list as you type and shows the empty state", async () => {
    const { user } = renderSelectFilter({ searchable: true });

    await waitFor(() => expect(options()).not.toHaveLength(0));

    await user.type(screen.getByPlaceholderText("Search"), "forg");
    await waitFor(() => expect(options()).toHaveLength(1));
    expect(option("Forgot")).toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText("Search"));
    await user.type(screen.getByPlaceholderText("Search"), "zzzzz");

    // cmdk's Command.Empty only renders once its own filtering runs — this also
    // pins the decision to leave cmdk's built-in filter enabled.
    await waitFor(() =>
      expect(
        screen.getByText(uiTestI18nResources.general.noResultsTitle),
      ).toBeInTheDocument(),
    );
    expect(options()).toHaveLength(0);
  });

  it("renders a custom option node when renderItem is given", async () => {
    renderSelectFilter({
      options: [
        {
          label: "Sign-up",
          value: "SIGN_UP",
          renderItem: () => <span>custom-node</span>,
        },
      ],
    });

    await waitFor(() =>
      expect(screen.getByText("custom-node")).toBeInTheDocument(),
    );
  });
});
