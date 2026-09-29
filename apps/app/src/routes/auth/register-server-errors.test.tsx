import { RegisterForm } from "@repo/auth/components";
import { fireEvent, render, screen } from "@testing-library/react";
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

describe("RegisterForm server errors", () => {
  it("shows a field error the API returned under that field", async () => {
    const { container } = render(
      <RegisterForm
        id="f"
        locale="en"
        countries={[{ label: "Vietnam", value: "vn" }]}
        messages={MESSAGES}
        onSubmit={async () => ({ email: "Email contains invalid characters" })}
      />,
    );

    const type = (placeholder: string, value: string) =>
      fireEvent.change(screen.getByPlaceholderText(placeholder), {
        target: { value },
      });
    type("Email", "name+shop@gmail.com");
    type("Name", "Lan");
    type("Password", "sup3rsecret");
    type("Confirm password", "sup3rsecret");
    fireEvent.change(container.querySelector("select")!, {
      target: { value: "vn" },
    });
    fireEvent.submit(container.querySelector("form")!);

    expect(
      await screen.findByText("Email contains invalid characters"),
    ).toBeInTheDocument();
  });
});
