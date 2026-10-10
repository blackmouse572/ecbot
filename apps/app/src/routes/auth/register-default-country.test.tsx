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

describe("RegisterForm default country", () => {
  it("shows the preselected country instead of the placeholder", () => {
    render(
      <RegisterForm
        id="f"
        locale="vi"
        countries={[
          { label: "Indonesia", value: "id-1" },
          { label: "Vietnam", value: "vn-1" },
        ]}
        defaultCountry="vn-1"
        messages={MESSAGES}
        onSubmit={async () => {}}
      />,
    );

    expect(screen.getByRole("combobox")).toHaveTextContent("Vietnam");
  });
});
