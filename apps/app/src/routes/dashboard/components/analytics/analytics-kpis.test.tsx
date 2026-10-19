import "@/i18n";
import { mockWorkspaceAnalytics } from "@/hooks/api/workspace-analytics.mock";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AnalyticsKpis } from "./analytics-kpis";

const data = mockWorkspaceAnalytics("30d");

describe("AnalyticsKpis", () => {
  it("shows only the numbers of tabs the member may see", () => {
    render(<AnalyticsKpis data={data} tabs={["bot"]} isLoading={false} />);
    expect(screen.getByText("Handoff rate")).toBeTruthy();
    expect(screen.queryByText("Conversion rate")).toBeNull();
  });

  it("drops a number whose section did not load", () => {
    render(
      <AnalyticsKpis
        data={{ bot: data.bot }}
        tabs={["conversion", "bot"]}
        isLoading={false}
      />,
    );
    expect(screen.getByText("Handoff rate")).toBeTruthy();
    expect(screen.queryByText("Conversion rate")).toBeNull();
  });

  it("renders nothing when no tab is allowed", () => {
    const { container } = render(
      <AnalyticsKpis data={data} tabs={[]} isLoading={false} />,
    );
    expect(container.innerHTML).toBe("");
  });
});
