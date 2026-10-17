import "@/i18n";
import { mockWorkspaceAnalytics } from "@/hooks/api/workspace-analytics.mock";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ConversionSection } from "./conversion-section";

const data = mockWorkspaceAnalytics("30d").conversion;

describe("ConversionSection", () => {
  it("shows credits per order to members who can read usage", () => {
    render(<ConversionSection data={data} showTokens />);
    expect(screen.getByText("Credits per order")).toBeTruthy();
  });

  it("hides credits per order from members who cannot read usage", () => {
    render(<ConversionSection data={data} showTokens={false} />);
    expect(screen.queryByText("Credits per order")).toBeNull();
  });
});
