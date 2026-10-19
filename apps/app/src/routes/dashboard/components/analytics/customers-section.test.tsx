import "@/i18n";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CustomersSection } from "./customers-section";

describe("CustomersSection", () => {
  it("explains an empty period with a title and a description", () => {
    render(<CustomersSection data={{ daily: [], byChannel: [] } as never} />);
    expect(screen.getAllByText("No data yet")).toHaveLength(2);
    expect(
      screen.getAllByText(
        "Numbers show up here once customers chat with your agents in this period.",
      ),
    ).toHaveLength(2);
  });

  it("treats zero-filled days as empty", () => {
    const daily = [
      { day: "2026-10-18", newCustomers: 0, returning: 0 },
      { day: "2026-10-19", newCustomers: 0, returning: 0 },
    ];
    render(<CustomersSection data={{ daily, byChannel: [] } as never} />);
    expect(screen.getAllByText("No data yet")).toHaveLength(2);
  });

  it("shows placeholders, not the empty state, while loading", () => {
    render(
      <CustomersSection
        data={{ daily: [], byChannel: [] } as never}
        isLoading
      />,
    );
    expect(screen.queryByText("No data yet")).toBeNull();
  });
});
