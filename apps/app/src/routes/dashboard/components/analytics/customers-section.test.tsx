import "@/i18n";
import { mockWorkspaceAnalytics } from "@/hooks/api/workspace-analytics.mock";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CustomersSection } from "./customers-section";

const base = mockWorkspaceAnalytics("30d").customers;

describe("CustomersSection", () => {
  it("explains an empty period with a title and a description", () => {
    render(<CustomersSection data={{ ...base, daily: [], byChannel: [] }} />);
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
    render(<CustomersSection data={{ ...base, daily, byChannel: [] }} />);
    expect(screen.getAllByText("No data yet")).toHaveLength(2);
  });

  it("shows placeholders, not the empty state, while loading", () => {
    render(
      <CustomersSection
        data={{ ...base, daily: [], byChannel: [] }}
        isLoading
      />,
    );
    expect(screen.queryByText("No data yet")).toBeNull();
  });
});
