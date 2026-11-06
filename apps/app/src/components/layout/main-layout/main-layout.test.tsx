import "@/i18n";
import { render, screen } from "@testing-library/react";
import { NavAccessProvider } from "@repo/ui/layout";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { UtilitySection } from "./main-layout";

describe("UtilitySection", () => {
  it("links every member to workspace settings under Activity", () => {
    render(
      <NavAccessProvider can={() => false}>
        <MemoryRouter initialEntries={["/kunmart/chatbot"]}>
          <Routes>
            <Route path=":workspaceSlug/*" element={<UtilitySection />} />
          </Routes>
        </MemoryRouter>
      </NavAccessProvider>,
    );

    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([
      "Activity",
      "Workspace settings",
    ]);
    expect(links[1]).toHaveAttribute("href", "/kunmart/settings");
  });
});
