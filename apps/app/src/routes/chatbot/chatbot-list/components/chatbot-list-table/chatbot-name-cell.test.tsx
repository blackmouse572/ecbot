import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChatbotNameCell } from "./chatbot-name-cell";

describe("ChatbotNameCell", () => {
  // Long names are cut with an ellipsis, so the full name shows on hover.
  it("keeps the full name on hover", () => {
    const name = "Linh trợ lý đặt bàn cho Bếp Nhà Mơ chi nhánh Hải Châu";
    render(<ChatbotNameCell name={name} avatar={null} />);

    expect(screen.getByText(name)).toHaveAttribute("title", name);
  });
});
