import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FileLink } from "./file-link";

describe("FileLink", () => {
  it("opens the file in a new tab under its name, with its type icon", () => {
    const { container } = render(
      <FileLink url="https://cdn/k/1790-bang-gia.pdf" name="Bảng giá" />,
    );

    const link = screen.getByRole("link", { name: "Bảng giá" });
    expect(link).toHaveAttribute("href", "https://cdn/k/1790-bang-gia.pdf");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
    expect(
      container.querySelector('[data-slot="file-type"][data-type="pdf"]'),
    ).toBeInTheDocument();
  });

  it("falls back to the URL's last path segment for the name", () => {
    render(<FileLink url="https://cdn/k/menu.pdf" />);

    expect(screen.getByRole("link", { name: "menu.pdf" })).toBeInTheDocument();
  });

  it("takes the type from the mime when the URL has no extension", () => {
    const { container } = render(
      <FileLink
        url="https://cdn/k/blob"
        name="Bảng giá"
        mediaType="application/pdf"
      />,
    );

    expect(
      container.querySelector('[data-slot="file-type"][data-type="pdf"]'),
    ).toBeInTheDocument();
  });
});
