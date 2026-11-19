import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlatformIconStack } from "./platform-icon-stack";

describe("PlatformIconStack", () => {
  it("overlaps one mark per entry, repeats included", () => {
    render(<PlatformIconStack types={["FACEBOOK_PAGE", "FACEBOOK_PAGE"]} />);

    expect(screen.getAllByRole("img")).toHaveLength(2);
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
  });

  it("caps the marks at four and counts the rest", () => {
    render(
      <PlatformIconStack
        types={[
          "FACEBOOK_PAGE",
          "INSTAGRAM_ACCOUNT",
          "ZALO_PAGE",
          "TELEGRAM_BOT",
          "WEBSITE_WIDGET",
          "API_CHANNEL",
        ]}
      />,
    );

    expect(screen.getAllByRole("img")).toHaveLength(4);
    expect(screen.getByText("+2")).toBeInTheDocument();
  });
});
