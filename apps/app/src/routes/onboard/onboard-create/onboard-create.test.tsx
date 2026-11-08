import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "@/i18n";

vi.mock("../onboard-select/components", () => ({
  OnboardCreateForm: () => <div>form</div>,
}));

import { OnboardCreate } from "./onboard-create";

// Switcher → Create workspace opens this dialog; it used to be announced as
// "Create Account" (QA gate run 6, D12).
describe("OnboardCreate", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("is titled Create workspace", () => {
    render(
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>
          <OnboardCreate />
        </MemoryRouter>
      </I18nextProvider>,
    );

    expect(
      screen.getByRole("dialog", { name: "Create workspace" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Create Account")).not.toBeInTheDocument();
  });
});
