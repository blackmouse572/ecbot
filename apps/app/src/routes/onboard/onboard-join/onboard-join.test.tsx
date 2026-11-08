import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "@/i18n";

vi.mock("./components", () => ({
  OnboardJoinForm: () => <div>form</div>,
}));

import { OnboardJoin } from "./onboard-join";

// /onboard → "Have a join code?" opens this dialog; it used to be announced as
// "Create Account" (QA run 7, D14).
describe("OnboardJoin", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("is titled Join a workspace", () => {
    render(
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>
          <OnboardJoin />
        </MemoryRouter>
      </I18nextProvider>,
    );

    expect(
      screen.getByRole("dialog", { name: "Join a workspace" }),
    ).toHaveAccessibleDescription(
      "Enter the join code from the workspace owner.",
    );
    expect(screen.queryByText("Create Account")).not.toBeInTheDocument();
  });
});
