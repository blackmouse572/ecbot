import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import { MessageImages } from "./message-images";

describe("MessageImages", () => {
  it("renders a sent file as a link row next to images", () => {
    render(
      <MessageImages
        align="end"
        attachments={[
          { type: "image", url: "https://cdn/s.jpg" },
          { type: "file", url: "https://cdn/k/bang-gia.pdf", name: "Bảng giá" },
          { type: "file" },
        ]}
      />,
    );

    expect(screen.getByAltText("conversations.image")).toHaveAttribute(
      "src",
      "https://cdn/s.jpg",
    );
    expect(screen.getByRole("link", { name: "Bảng giá" })).toHaveAttribute(
      "href",
      "https://cdn/k/bang-gia.pdf",
    );
    expect(screen.getAllByRole("link")).toHaveLength(2);
  });
});
