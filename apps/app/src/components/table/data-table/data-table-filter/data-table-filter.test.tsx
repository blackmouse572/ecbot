import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { DataTableFilter, type Filter } from "./data-table-filter";

const status: Filter = {
  key: "status",
  label: "Trạng thái",
  type: "select",
  options: [{ label: "Mở", value: "OPEN" }],
};
const stage: Filter = {
  key: "stage",
  label: "Giai đoạn",
  type: "select",
  options: [{ label: "Hỏi giá", value: "ASKED_PRICE" }],
};

const renderAt = (url: string, filters: Filter[]) => {
  const tree = (f: Filter[]) => (
    <MemoryRouter initialEntries={[url]}>
      <DataTableFilter filters={f} prefix="conv" />
    </MemoryRouter>
  );
  const view = render(tree(filters));
  return { rerender: (f: Filter[]) => view.rerender(tree(f)) };
};

describe("DataTableFilter", () => {
  it("shows a chip for a filter already in the URL", () => {
    renderAt("/c?conv_status=OPEN", [status]);
    expect(screen.getByText("Trạng thái")).toBeInTheDocument();
  });

  // A flag-gated filter is defined only once the flags load, after mount.
  it("shows a chip for a URL filter whose definition arrives later", () => {
    const view = renderAt("/c?conv_stage=ASKED_PRICE", [status]);
    expect(screen.queryByText("Giai đoạn")).not.toBeInTheDocument();

    view.rerender([status, stage]);
    expect(screen.getByText("Giai đoạn")).toBeInTheDocument();
  });
});
