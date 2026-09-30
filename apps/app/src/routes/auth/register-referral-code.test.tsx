import { RegisterForm } from "@repo/auth/components";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
};

describe("RegisterForm referral code", () => {
  it("takes the code as typed, letters and leading zeros included", async () => {
    render(
      <RegisterForm
        id="f"
        locale="en"
        countries={[]}
        messages={MESSAGES}
        onSubmit={async () => {}}
      />,
    );
    const input = screen.getByPlaceholderText("Referral code");

    await userEvent.type(input, "0aB12");

    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveValue("0aB12");
  });
});
