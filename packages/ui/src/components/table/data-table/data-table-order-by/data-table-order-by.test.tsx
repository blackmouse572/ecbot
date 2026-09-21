import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import {
  renderWithProviders,
  uiTestI18nResources,
} from "../../../../../test/i18n";
import { DataTableOrderBy } from "./data-table-order-by";

type Row = { createdAt: string; name: string };

function Harness({ prefix }: { prefix?: string }) {
  const location = useLocation();
  return (
    <>
      <DataTableOrderBy<Row>
        keys={[
          { key: "createdAt", label: "Joined at" },
          { key: "name", label: "Name" },
        ]}
        prefix={prefix}
      />
      <span data-testid="search">{location.search}</span>
    </>
  );
}

// Radix's dropdown opens on pointerdown, which fireEvent.click does not send.
const user = userEvent.setup();

const openMenu = () =>
  user.click(
    screen.getByRole("button", { name: uiTestI18nResources.general.orderBy }),
  );

const pick = (name: string | RegExp) =>
  user.click(screen.getByRole("menuitemradio", { name }));

const search = () =>
  new URLSearchParams(screen.getByTestId("search").textContent ?? "");

describe("DataTableOrderBy", () => {
  // The control offers a column radio group and a direction radio group. A user
  // who only picks a direction — the obvious gesture when there is one sortable
  // column — used to hit the `!state.key` branch, which DELETES the order param
  // instead of writing one, so the table never re-sorted.
  it("writes an order param when only a direction is picked", async () => {
    renderWithProviders(<Harness />);
    await openMenu();

    await pick(new RegExp(uiTestI18nResources.general.descending));

    expect(search().get("order")).toBe("-createdAt");
  });

  it("keeps the chosen column when the direction changes", async () => {
    renderWithProviders(<Harness />);
    await openMenu();

    await pick("Name");
    expect(search().get("order")).toBe("name");

    await pick(new RegExp(uiTestI18nResources.general.descending));
    expect(search().get("order")).toBe("-name");
  });

  it("seeds itself from an order param already in the URL", async () => {
    renderWithProviders(<Harness />, { initialEntries: ["/?order=-name"] });
    await openMenu();

    await pick(new RegExp(uiTestI18nResources.general.ascending));

    expect(search().get("order")).toBe("name");
  });

  it("namespaces the param when a prefix is given", async () => {
    renderWithProviders(<Harness prefix="ph" />);
    await openMenu();

    await pick(new RegExp(uiTestI18nResources.general.descending));

    expect(search().get("ph_order")).toBe("-createdAt");
    expect(search().get("order")).toBeNull();
  });

  // Every other control that writes to the URL (filters, ClearAllFilters) resets
  // `page` when its value changes, so the user never lands on a now-out-of-range
  // page. Order-by was the one control that didn't: changing sort while on page 3
  // used to leave `page=3` in place even though the re-sorted result may not have
  // a page 3.
  it("resets page and offset when the order changes", async () => {
    renderWithProviders(<Harness />, {
      initialEntries: ["/?page=3&offset=40"],
    });
    await openMenu();

    await pick("Name");

    expect(search().get("page")).toBeNull();
    expect(search().get("offset")).toBeNull();
  });

  it("resets the namespaced page and offset when the order changes with a prefix", async () => {
    renderWithProviders(<Harness prefix="ph" />, {
      initialEntries: ["/?ph_page=3&ph_offset=40"],
    });
    await openMenu();

    await pick(new RegExp(uiTestI18nResources.general.descending));

    expect(search().get("ph_page")).toBeNull();
    expect(search().get("ph_offset")).toBeNull();
  });
});
