import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "../../../../test/i18n";
import { isStrongPassword } from "../../../utils/password";
import { PasswordStrength } from "./password-strength";

describe("isStrongPassword", () => {
  it.each([
    ["Abcdefg1", true],
    ["abcdefg1", false],
    ["ABCDEFG1", false],
    ["Abcdefgh", false],
    ["Abc1", false],
  ])("%s -> %s", (password, expected) => {
    expect(isStrongPassword(password)).toBe(expected);
  });
});

describe("PasswordStrength", () => {
  it("prompts for a password when empty", () => {
    renderWithProviders(<PasswordStrength password="" />);

    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "0",
    );
    expect(screen.getByText("Enter a password")).toBeInTheDocument();
  });

  it("counts the requirements a password meets", () => {
    renderWithProviders(<PasswordStrength password="abc1" />);

    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "2",
    );
    expect(screen.getByText("Weak")).toBeInTheDocument();
    expect(screen.getByText("2/4 requirements met")).toBeInTheDocument();
  });

  it("calls a password strong once every requirement is met", () => {
    renderWithProviders(<PasswordStrength password="Abcdefg1" />);

    expect(screen.getByText("Strong")).toBeInTheDocument();
    expect(screen.getAllByText("Requirement met")).toHaveLength(4);
  });
});
