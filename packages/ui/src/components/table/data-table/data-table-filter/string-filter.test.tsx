import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../../../test/i18n";
import { DataTableFilterContext } from "./context";
import { StringFilter } from "./string-filter";

const filter = { key: "chatbot", label: "Chatbot" };

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

function renderStringFilter({
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
        <StringFilter
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

// The remove (X) button is the only plain <button> the chip renders outside
// the popover portal — the trigger is a Popover.Trigger asChild wrapping
// Text, not a <button>, so scoping to the chip root and asking for a button
// role finds exactly this one.
const removeButton = (container: HTMLElement) =>
  container.querySelector(".bg-ui-bg-field button") as HTMLButtonElement;

describe("StringFilter", () => {
  it("writes the typed value to the URL, debounced", async () => {
    const { urlSearch, user } = renderStringFilter();

    await user.type(screen.getByRole("textbox"), "acme");

    await waitFor(() => expect(urlSearch()).toContain("chatbot=acme"), {
      timeout: 2000,
    });
  });

  it("deletes the param when the input is cleared", async () => {
    const { urlSearch, user } = renderStringFilter({
      initialEntries: ["/?chatbot=acme"],
    });

    await user.clear(screen.getByRole("textbox"));

    await waitFor(() => expect(urlSearch()).not.toContain("chatbot"), {
      timeout: 2000,
    });
  });

  it("namespaces the param when a prefix is given", async () => {
    const { urlSearch, user } = renderStringFilter({ prefix: "ph" });

    await user.type(screen.getByRole("textbox"), "acme");

    await waitFor(() => expect(urlSearch()).toContain("ph_chatbot=acme"), {
      timeout: 2000,
    });
    expect(urlSearch()).not.toMatch(/(?<!ph_)chatbot=/);
  });

  it("removes the param and notifies removeFilter when the chip's X is clicked", async () => {
    // Radix's `modal` popover disables pointer-events on everything outside
    // its Content while open, so the chip's own remove button (a sibling of
    // Content, not inside it) has to be exercised while the popover is closed.
    const { urlSearch, removeFilter, user, container } = renderStringFilter({
      initialEntries: ["/?chatbot=acme"],
      openOnMount: false,
    });

    await user.click(removeButton(container));

    expect(urlSearch()).not.toContain("chatbot");
    expect(removeFilter).toHaveBeenCalledWith("chatbot");
  });
});
