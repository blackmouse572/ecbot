import "@/i18n";
import { HONEYPOT_FIELD_NAME } from "@repo/auth/components";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

const resetPassword = vi.fn(async () => true);

vi.mock("@/hooks/api", () => ({
  useResetPasswordToken: () => ({ isLoading: false, isError: false }),
  useResetPassword: () => ({ resetPassword, isLoading: false }),
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

  // The only text input before the password fields was the bot trap, so the
  // browser's password manager filled it as the username and the submit was
  // dropped silently. The emailed token already keeps bots out of this form.
  it("submits the new password, with no bot trap for autofill to fill", async () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/reset-password?token=tok-1"]}>
        <ResetPasswordPage />
      </MemoryRouter>,
    );

    expect(
      container.querySelector(`input[name="${HONEYPOT_FIELD_NAME}"]`),
    ).toBeNull();

    fireEvent.change(screen.getByPlaceholderText("New password"), {
      target: { value: "Sup3rsecret" },
    });
    fireEvent.change(screen.getByPlaceholderText("Confirm new password"), {
      target: { value: "Sup3rsecret" },
    });
    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() =>
      expect(resetPassword).toHaveBeenCalledWith("Sup3rsecret"),
    );
  });

  // The API rejects a password without a number, a lowercase and an uppercase
  // letter; the form used to check only the length and let it through.
  it("blocks a password the API would reject and says why", async () => {
    resetPassword.mockClear();
    const { container } = render(
      <MemoryRouter initialEntries={["/reset-password?token=tok-1"]}>
        <ResetPasswordPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText("New password"), {
      target: { value: "sup3rsecret" },
    });
    fireEvent.change(screen.getByPlaceholderText("Confirm new password"), {
      target: { value: "sup3rsecret" },
    });
    fireEvent.submit(container.querySelector("form")!);

    expect(
      await screen.findByText(/lowercase and an uppercase letter/),
    ).toBeTruthy();
    expect(resetPassword).not.toHaveBeenCalled();
  });
});
