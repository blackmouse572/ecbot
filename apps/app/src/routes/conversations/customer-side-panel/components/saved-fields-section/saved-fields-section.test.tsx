import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SavedFieldsSection } from "./saved-fields-section";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("SavedFieldsSection", () => {
  it("lists what the agent saved, with readable labels", () => {
    render(
      <SavedFieldsSection
        fields={{ address: "12 Lê Lợi, Quận 1", party_size: "4" }}
      />,
    );
    expect(
      screen.getByText("conversations.customer.panel.savedFields.address"),
    ).toBeInTheDocument();
    expect(screen.getByText("12 Lê Lợi, Quận 1")).toBeInTheDocument();
    expect(screen.getByText("Party size")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("renders nothing when the agent saved nothing", () => {
    const { container } = render(<SavedFieldsSection fields={{}} />);
    expect(container).toBeEmptyDOMElement();
  });
});
