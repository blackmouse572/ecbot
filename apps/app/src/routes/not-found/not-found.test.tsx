import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "@/i18n";

vi.mock("@/hooks/api", () => ({
  useWorkspace: () => ({ workspace: undefined }),
}));

import { NotFound } from "./not-found";

// QA gate D13: an unknown route such as /{workspace}/settings/team said
// "Bad Request, malformed syntax". It is a missing page, so say that.
describe("NotFound", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("says the page was not found, not that the request was bad", () => {
    render(
      <I18nextProvider i18n={i18n}>
        <MemoryRouter initialEntries={["/kunmart/settings/team"]}>
          <NotFound />
        </MemoryRouter>
      </I18nextProvider>,
    );

    expect(screen.getByText("Page Not Found")).toBeTruthy();
    expect(screen.queryByText("Bad Request")).toBeNull();
  });
});
