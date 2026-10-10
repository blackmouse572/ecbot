import { fireEvent, render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { beforeEach, describe, expect, it, vi } from "vitest";

const accept = vi.fn();
const logout = vi.fn();
vi.mock("@/hooks/api", () => ({ useLogout: () => logout }));
const state = { required: false, impersonating: false };
vi.mock("@/hooks/api/users", () => ({
  useTermsAcceptance: () => ({
    required: state.required,
    accept,
    isPending: false,
  }),
}));
vi.mock("@/modules/impersonation", () => ({
  useImpersonation: () => (state.impersonating ? { user: {} } : null),
}));

import i18n from "@/i18n";
import { TermsAcceptancePrompt } from "./terms-acceptance-prompt";

const renderPrompt = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <TermsAcceptancePrompt />
    </I18nextProvider>,
  );

// Users who signed up before consent was recorded, or accepted an older
// version, accept the current Terms and Privacy Policy before continuing.
describe("TermsAcceptancePrompt", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    accept.mockReset().mockResolvedValue(undefined);
    logout.mockReset();
    state.required = false;
    state.impersonating = false;
  });

  it("stays hidden when the current version is accepted", () => {
    renderPrompt();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("asks, links both policies, and records acceptance", () => {
    state.required = true;
    renderPrompt();

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Terms of Service" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Privacy Policy" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "I agree" }));
    expect(accept).toHaveBeenCalled();
  });

  it("never asks an operator who is impersonating the user", () => {
    state.required = true;
    state.impersonating = true;
    renderPrompt();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  // The dialog blocks the app, so it needs a way out besides agreeing.
  it("lets the user sign out instead of agreeing", () => {
    state.required = true;
    renderPrompt();

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(logout).toHaveBeenCalled();
    expect(accept).not.toHaveBeenCalled();
  });
});
