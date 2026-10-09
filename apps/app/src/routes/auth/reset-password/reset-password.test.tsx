import "@/i18n";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/api", () => ({
  useResetPasswordToken: () => ({ isLoading: false, isError: false }),
  useResetPassword: () => ({ resetPassword: vi.fn(), isLoading: false }),
}));

import { ResetPasswordPage } from "./reset-password";

// #187: the link in the email is enough; the page used to ask for the code
// from that same email before showing the password form.
describe("ResetPasswordPage", () => {
  it("asks for the new password straight away, with no code step", () => {
    render(
      <MemoryRouter initialEntries={["/reset-password?token=tok-1"]}>
        <ResetPasswordPage />
      </MemoryRouter>,
    );

    expect(screen.getByPlaceholderText("New password")).toBeTruthy();
    expect(screen.getByPlaceholderText("Confirm new password")).toBeTruthy();
    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
  });
});
