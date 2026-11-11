import { TooltipProvider } from "@medusajs/ui";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@/i18n";
import { beforeEach, describe, expect, it, vi } from "vitest";

// "Sửa nhãn": an operator sets any layer by hand. Only what changed is sent,
// always with a reason, so the timeline says who changed what and why.

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

(globalThis as A).ResizeObserver =
  (globalThis as A).ResizeObserver ?? ResizeObserverMock;

const mutateAsync = vi.fn();

vi.mock("@/hooks/api/customer-marketing", () => ({
  useUpdateCustomerMarketing: () => ({ mutateAsync, isPending: false }),
}));

import type { CustomerMarketingStateGetResponseDto } from "@/hooks/api/customer-marketing";
import { MarketingEditDrawer } from "./marketing-edit-drawer";

const marketing: CustomerMarketingStateGetResponseDto = {
  stage: "ASKED_PRICE",
  permission: "GRANTED",
  permissionUntil: null,
  hostile: false,
  dormant: false,
  stageEvent: null,
  permissionEvent: null,
  hostileEvent: null,
  freeWindows: [],
};

const renderDrawer = () => {
  const onOpenChange = vi.fn();
  render(
    <TooltipProvider>
      <MarketingEditDrawer
        customerId="c-1"
        customerName="Võ Thanh Tâm"
        marketing={marketing}
        open
        onOpenChange={onOpenChange}
      />
    </TooltipProvider>,
  );

  return onOpenChange;
};

const save = () => screen.getByRole("button", { name: "Save labels" });

describe("MarketingEditDrawer", () => {
  beforeEach(() => {
    mutateAsync.mockReset().mockResolvedValue({});
  });

  it("opens on the current labels, with nothing to save yet", () => {
    renderDrawer();

    expect(screen.getByRole("radio", { name: /^Agreed/ })).toBeChecked();
    expect(screen.getByRole("switch")).not.toBeChecked();
    expect(save()).toBeDisabled();
  });

  it("sends only the changed layer, with the reason", async () => {
    const onOpenChange = renderDrawer();

    await userEvent.click(screen.getByRole("radio", { name: /^Stopped/ }));
    await userEvent.type(
      screen.getByRole("textbox"),
      "Customer asked us to stop on the phone",
    );
    await userEvent.click(save());

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        permission: "STOPPED",
        reason: "Customer asked us to stop on the phone",
      }),
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("needs a reason", async () => {
    renderDrawer();

    await userEvent.click(screen.getByRole("switch"));
    await userEvent.click(save());

    expect(
      await screen.findByText("Enter a reason for the change."),
    ).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("needs an end date to pause", async () => {
    renderDrawer();

    await userEvent.click(screen.getByRole("radio", { name: /^Paused/ }));
    await userEvent.type(screen.getByRole("textbox"), "After Tết");
    await userEvent.click(save());

    expect(
      await screen.findByText("Pick a day after today."),
    ).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });
});
