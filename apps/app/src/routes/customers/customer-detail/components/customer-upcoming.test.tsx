import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@/i18n";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Sắp tới: reminders the bot will send and product groups paused for now.

const state = vi.hoisted(() => ({
  followups: [] as unknown[],
  reactions: [] as unknown[],
  cancel: vi.fn(),
  resume: vi.fn(),
}));

vi.mock("@repo/auth", () => ({
  useAbility: () => ({ can: () => true }),
}));
vi.mock("@/hooks/api/followups", () => ({
  useCustomerFollowups: () => ({ followups: state.followups }),
  useCancelFollowup: () => ({ mutate: state.cancel, isPending: false }),
}));
vi.mock("@/hooks/api/customer-marketing", () => ({
  useCustomerMarketing: () => ({
    marketing: { reactions: state.reactions },
  }),
  useRemoveProductReaction: () => ({ mutate: state.resume, isPending: false }),
}));

import { CustomerUpcoming } from "./customer-upcoming";

describe("CustomerUpcoming", () => {
  beforeEach(() => {
    state.followups = [];
    state.reactions = [];
    state.cancel.mockReset();
    state.resume.mockReset();
  });

  it("shows nothing when nothing is coming up", () => {
    const { container } = render(<CustomerUpcoming customerId="c-1" />);

    expect(container).toBeEmptyDOMElement();
  });

  it("lists reminders and paused groups, each with a way to undo it", async () => {
    state.followups = [
      {
        followupId: "f-1",
        reason: "Customer will decide at the weekend",
        scheduledAt: "2026-11-28T02:00:00Z",
      },
    ];
    state.reactions = [
      {
        productGroupId: "g-1",
        productGroupName: "Serum",
        until: "2026-11-30T00:00:00Z",
        reason: "để sau nha",
      },
    ];
    render(<CustomerUpcoming customerId="c-1" />);

    expect(screen.getByText("2 items")).toBeInTheDocument();
    expect(
      screen.getByText("Customer will decide at the weekend"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Offers for Serum paused until/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(state.cancel).toHaveBeenCalledWith("f-1");
    await userEvent.click(screen.getByRole("button", { name: "Resume" }));
    expect(state.resume).toHaveBeenCalledWith("g-1");
  });
});
