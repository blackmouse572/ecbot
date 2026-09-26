import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
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

describe("useChatbotTableColumns", () => {
  it("gives every column a distinct id", () => {
    const { result } = renderHook(() => useChatbotTableColumns(), { wrapper });
    const ids = result.current.map((column) => column.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("typingIndicator");
  });
});
