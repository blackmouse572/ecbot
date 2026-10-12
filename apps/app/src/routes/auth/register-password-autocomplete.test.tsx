import { RegisterForm } from "@repo/auth/components";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

const MESSAGES = {
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
};

// "current-password" made browsers treat sign-up as a login form and autofill
// a saved account into it, so a saved email could land in the referral code field.
describe("RegisterForm password autocomplete", () => {
  it("marks both password fields as a new password", () => {
    render(
      <RegisterForm
        id="f"
        locale="en"
        countries={[]}
        messages={MESSAGES}
        onSubmit={async () => {}}
      />,
    );

    expect(screen.getByPlaceholderText("Password")).toHaveAttribute(
      "autocomplete",
      "new-password",
    );
    expect(screen.getByPlaceholderText("Confirm password")).toHaveAttribute(
      "autocomplete",
      "new-password",
    );
  });
});
