import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AccountTypeCell } from "./account-type-cell";

describe("AccountTypeCell", () => {
  it("renders a badge labelled with the ZALO_PAGE type", () => {
    render(<AccountTypeCell type="ZALO_PAGE" />);
    expect(screen.getByText("ZALO_PAGE")).toBeInTheDocument();
  });

  it("renders the ZALO_ACCOUNT type", () => {
    render(<AccountTypeCell type="ZALO_ACCOUNT" />);
    expect(screen.getByText("ZALO_ACCOUNT")).toBeInTheDocument();
  });
});
