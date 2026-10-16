import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ConversationDetailSkeleton } from "./conversation-detail-skeleton";

describe("ConversationDetailSkeleton", () => {
  it("holds the customer panel's place so the layout doesn't jump", () => {
    render(<ConversationDetailSkeleton />);
    expect(screen.getByTestId("customer-panel-skeleton")).toBeInTheDocument();
  });
});
