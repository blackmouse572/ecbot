import "@/i18n";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.hoisted(() => ({
  status: "ready" as string,
  enabled: false,
  isPending: false,
  enable: vi.fn(),
  disable: vi.fn(),
}));

vi.mock("@/modules/pwa", () => ({ usePushNotifications: () => push }));

import { PreferencePushRow } from "./preference-push-row";

const toggle = () =>
  screen.getByRole("switch", { name: "Notifications on this device" });

describe("PreferencePushRow", () => {
  beforeEach(() => {
    Object.assign(push, { status: "ready", enabled: false });
    push.enable.mockReset().mockResolvedValue(undefined);
    push.disable.mockReset().mockResolvedValue(undefined);
  });

  it("turns push on for this device", () => {
    render(<PreferencePushRow />);

    expect(toggle()).toHaveAttribute("aria-checked", "false");
    fireEvent.click(toggle());

    expect(push.enable).toHaveBeenCalled();
  });

  it("turns push off when it is on", () => {
    push.enabled = true;
    render(<PreferencePushRow />);

    fireEvent.click(toggle());

    expect(push.disable).toHaveBeenCalled();
  });

  it("asks iPhone users to add the app to the Home Screen first", () => {
    push.status = "needs-install";
    render(<PreferencePushRow />);

    expect(toggle()).toBeDisabled();
    expect(screen.getByText(/Add to Home Screen/)).toBeInTheDocument();
  });

  it("explains how to unblock notifications", () => {
    push.status = "denied";
    render(<PreferencePushRow />);

    expect(toggle()).toBeDisabled();
    expect(screen.getByText(/blocked/)).toBeInTheDocument();
  });

  it("is hidden when the server has no push set up", () => {
    push.status = "off";
    const { container } = render(<PreferencePushRow />);

    expect(container).toBeEmptyDOMElement();
  });
});
