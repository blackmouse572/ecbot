import { RegisterForm } from "@repo/auth/components";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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
  acceptTerms: {
    label: "I agree to the Terms of Service and Privacy Policy",
    required: "Please accept the terms to continue.",
  },
};

// Consent record: sign-up only goes out once the user ticks the agreement,
// and the request carries acceptTerms so the API can record it.
describe("RegisterForm terms agreement", () => {
  const renderAndFill = (onSubmit = vi.fn(async () => {})) => {
    const { container } = render(
      <RegisterForm
        id="f"
        locale="en"
        countries={[{ label: "Vietnam", value: "vn" }]}
        messages={MESSAGES}
        onSubmit={onSubmit}
      />,
    );
    const type = (placeholder: string, value: string) =>
      fireEvent.change(screen.getByPlaceholderText(placeholder), {
        target: { value },
      });
    type("Email", "lan@shop.vn");
    type("Name", "Lan");
    type("Password", "sup3rsecret");
    type("Confirm password", "sup3rsecret");
    fireEvent.change(container.querySelector("select")!, {
      target: { value: "vn" },
    });
    return { onSubmit, form: container.querySelector("form")! };
  };

  it("blocks sign-up until the agreement is ticked", async () => {
    const { onSubmit, form } = renderAndFill();

    fireEvent.submit(form);

    expect(
      await screen.findByText(MESSAGES.acceptTerms.required),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("sends acceptTerms: true once the agreement is ticked", async () => {
    const { onSubmit, form } = renderAndFill();

    fireEvent.click(
      screen.getByRole("checkbox", { name: MESSAGES.acceptTerms.label }),
    );
    fireEvent.submit(form);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ acceptTerms: true }),
    );
  });
});
