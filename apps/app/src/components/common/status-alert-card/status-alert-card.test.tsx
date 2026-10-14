import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusAlertCard } from "./status-alert-card";

describe("StatusAlertCard", () => {
  it("renders the title, description and action", () => {
    render(
      <StatusAlertCard
        title="Connected"
        description="Ready"
        action={<a href="/x">Open</a>}
      />,
    );
    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open" })).toBeInTheDocument();
  });

  it("omits the description and action when not given", () => {
    render(<StatusAlertCard title="Connected" />);
    expect(screen.queryByRole("link")).toBeNull();
  });
});
