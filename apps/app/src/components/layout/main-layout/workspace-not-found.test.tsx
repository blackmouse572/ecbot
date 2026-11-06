import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";

import i18n from "@/i18n";
import { WorkspaceNotFound } from "./workspace-not-found";

const ALPHA = { id: "1", slug: "alpha", name: "Alpha shop" } as A;

const renderWith = (workspaces: A[]) =>
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <WorkspaceNotFound workspaces={workspaces} />
      </MemoryRouter>
    </I18nextProvider>,
  );

// QA gate D10: a workspace URL the user cannot open says so, the same way
// for a missing workspace and a foreign one, with a way back to their own.
describe("WorkspaceNotFound", () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage("en");
  });

  it("says the workspace was not found or is not theirs", () => {
    renderWith([ALPHA]);

    expect(screen.getByText("Workspace not found")).toBeTruthy();
    expect(screen.getByText(/not a member/i)).toBeTruthy();
  });

  it("links back to the user's own workspace", () => {
    renderWith([ALPHA]);

    const link = screen.getByRole("link", { name: /Alpha shop/ });
    expect(link.getAttribute("href")).toBe("/alpha/dashboard");
  });
});
