import { LoginForm, RegisterForm } from "@repo/auth/components";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

// @medusajs/ui's Input adds a hard-coded English "Show password" toggle, so the
// auth forms use the translated PasswordInput instead. No i18n instance is set
// up here, so a translated label renders as its key.
describe("auth form password toggles", () => {
  it("labels the login password toggle through i18n", () => {
    render(
      <LoginForm
        id="f"
        locale="en"
        messages={{ emailPlaceholder: "Email", passwordPlaceholder: "Pass" }}
        onSubmit={async () => {}}
      />,
    );

    expect(
      screen.getByRole("button", { name: "password.show" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Show password" })).toBeNull();
  });

  it("labels both register password toggles through i18n", () => {
    render(
      <RegisterForm
        id="f"
        locale="en"
        countries={[]}
        messages={{
          emailPlaceholder: "Email",
          namePlaceholder: "Name",
          referralCodePlaceholder: "Referral code",
          countryPlaceholder: "Country",
          passwordPlaceholder: "Password",
          confirmPassword: {
            placeholder: "Confirm password",
            error: { notMatchPassword: "Passwords do not match" },
          },
          acceptTerms: { label: "I agree", required: "Please agree" },
        }}
        onSubmit={async () => {}}
      />,
    );

    expect(
      screen.getAllByRole("button", { name: "password.show" }),
    ).toHaveLength(2);
  });
});
