import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "../../../../test/i18n";
import { PasswordInput } from "./password-input";

describe("PasswordInput", () => {
  it("hides the value until the toggle is pressed", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PasswordInput placeholder="Password" />);

    const input = screen.getByPlaceholderText("Password");
    const toggle = screen.getByRole("button", { name: "Show password" });
    expect(input).toHaveAttribute("type", "password");
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    await user.click(toggle);

    expect(input).toHaveAttribute("type", "text");
    expect(
      screen.getByRole("button", { name: "Hide password" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("renders exactly one visibility toggle", () => {
    renderWithProviders(<PasswordInput />);

    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("marks the field invalid and shows the error", () => {
    renderWithProviders(
      <PasswordInput placeholder="Password" errorMessage="Too short" />,
    );

    expect(screen.getByPlaceholderText("Password")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByText("Too short")).toBeInTheDocument();
  });
});
