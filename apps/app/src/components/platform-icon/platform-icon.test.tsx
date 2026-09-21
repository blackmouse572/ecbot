import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlatformIcon } from "./platform-icon";

// Every account type the backend can emit must resolve to an icon. ZALO_PAGE is
// the type produced by the Zalo OA platform adapter, so it must render like the
// other connected-page types.
const ALL_TYPES = [
  "FACEBOOK_ACCOUNT",
  "FACEBOOK_PAGE",
  "INSTAGRAM_ACCOUNT",
  "INSTAGRAM_PAGE",
  "ZALO_ACCOUNT",
  "ZALO_PAGE",
  "TIKTOK_SHOP",
  "SHOPEE_SHOP",
] as const;

describe("PlatformIcon", () => {
  it("renders the Zalo icon for ZALO_PAGE", () => {
    render(<PlatformIcon type="ZALO_PAGE" />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "/icons/zalo.svg");
    expect(img).toHaveAttribute("alt", "Zalo");
    expect(img).toHaveAttribute("title", "Zalo");
  });

  it("renders the Zalo icon for ZALO_ACCOUNT too", () => {
    render(<PlatformIcon type="ZALO_ACCOUNT" />);
    expect(screen.getByRole("img")).toHaveAttribute("src", "/icons/zalo.svg");
  });

  it("renders nothing when type is null/undefined", () => {
    const { container } = render(<PlatformIcon type={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it.each(ALL_TYPES)("resolves a non-empty icon src for %s", (type) => {
    render(<PlatformIcon type={type} />);
    expect(screen.getByRole("img").getAttribute("src")).toMatch(
      /^\/icons\/.+\.svg$/,
    );
  });
});
