import { render, renderHook, screen } from "@testing-library/react";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import type { ReactNode } from "react";
import "@/i18n";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { useChatbotTableColumns } from "./use-chatbot-table-columns";

const wrapper = ({ children }: { children: ReactNode }) => (
  <MemoryRouter initialEntries={["/acme"]}>
    <Routes>
      <Route path="/:workspaceSlug" element={children} />
    </Routes>
  </MemoryRouter>
);

// The list endpoint's shape: accounts arrive as account objects.
const row = {
  id: "a",
  name: "Alpha",
  status: "active",
  type: "beauty",
  accounts: [{ id: "p1", type: "FACEBOOK_PAGE", name: "Alpha page" }],
};

/** Renders the conversations cell of one row. */
const ConversationsCell = ({ counts }: { counts?: Map<string, number> }) => {
  const columns = useChatbotTableColumns(counts);
  const table = useReactTable({
    data: [row] as never[],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });
  const cell = table
    .getRowModel()
    .rows[0].getVisibleCells()
    .find((c) => c.column.id === "conversations")!;
  const render = cell.column.columnDef.cell as (ctx: unknown) => ReactNode;
  return <>{render(cell.getContext())}</>;
};

describe("useChatbotTableColumns", () => {
  it("keeps only the columns that tell agents apart", () => {
    const { result } = renderHook(() => useChatbotTableColumns(), { wrapper });

    expect(result.current.map((column) => column.id)).toEqual([
      "name",
      "status",
      "channels",
      "conversations",
      "updatedAt",
    ]);
  });

  it("shows the agent's conversations from the last 7 days", () => {
    render(<ConversationsCell counts={new Map([["a", 1284]])} />, { wrapper });

    expect(screen.getByText("1,284")).toBeInTheDocument();
  });

  it("shows 0 for an agent with no conversations once the counts load", () => {
    render(<ConversationsCell counts={new Map()} />, { wrapper });

    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("shows a dash only while the counts are unknown", () => {
    render(<ConversationsCell />, { wrapper });

    expect(screen.getByText("-")).toBeInTheDocument();
  });
});
