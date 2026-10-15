import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";

import i18n from "@/i18n";
import { WorkspaceSuspended } from "./workspace-suspended";

const ALPHA = { id: "1", slug: "alpha", name: "Alpha shop" } as A;
const DELTA = { id: "4", slug: "delta", name: "Delta" } as A;

const renderAt = (workspaces: A[]) =>
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <WorkspaceSuspended workspaces={workspaces} currentSlug="delta" />
      </MemoryRouter>
    </I18nextProvider>,
  );

// A member who opens a workspace an admin suspended sees why it is locked,
// and can switch to another workspace they belong to.
describe("WorkspaceSuspended", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("says the workspace is suspended and data is kept", () => {
    renderAt([DELTA]);

    expect(screen.getByText("This workspace is suspended")).toBeTruthy();
    expect(screen.getByText(/data is kept/i)).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("links to another workspace the member belongs to", () => {
    renderAt([DELTA, ALPHA]);

    const link = screen.getByRole("link", { name: /Alpha shop/ });
    expect(link.getAttribute("href")).toBe("/alpha/dashboard");
  });
});
