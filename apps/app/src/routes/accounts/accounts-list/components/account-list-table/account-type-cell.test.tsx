import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AccountTypeCell } from "./account-type-cell";

describe("AccountTypeCell", () => {
  it("shows the channel name instead of the raw type", () => {
    render(<AccountTypeCell type="WEBSITE_WIDGET" />);
    expect(screen.getByText("Website")).toBeInTheDocument();
    expect(screen.queryByText("WEBSITE_WIDGET")).toBeNull();
  });

  it("shows the channel icon", () => {
    const { container } = render(<AccountTypeCell type="ZALO_PAGE" />);
    expect(screen.getByText("Zalo")).toBeInTheDocument();
    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      "/icons/zalo.svg",
    );
  });
});
