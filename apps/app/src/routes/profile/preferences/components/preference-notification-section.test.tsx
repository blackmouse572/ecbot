import "@/i18n";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const updateNotifications = vi.hoisted(() => vi.fn());
const me = vi.hoisted(() => ({
  user: { handoffEmails: true } as { handoffEmails?: boolean },
}));

vi.mock("@/hooks/api", () => ({
  useMe: () => ({ user: me.user, isLoading: false }),
  useUpdateNotificationSettings: () => ({
    updateNotifications,
    isPending: false,
  }),
}));

import { PreferenceNotificationSection } from "./preference-notification-section";

// Handover emails can be switched off per person (email PR review).
describe("PreferenceNotificationSection", () => {
  beforeEach(() => updateNotifications.mockReset());

  it("shows the current choice and saves the new one", () => {
    render(<PreferenceNotificationSection />);

    const toggle = screen.getByRole("switch", {
      name: "Email me when a customer needs a person",
    });
    expect(toggle).toHaveAttribute("aria-checked", "true");

    fireEvent.click(toggle);

    expect(updateNotifications).toHaveBeenCalledWith({ handoffEmails: false });
  });

  it("treats a profile without the field as on", () => {
    me.user = {};
    render(<PreferenceNotificationSection />);

    expect(
      screen.getByRole("switch", {
        name: "Email me when a customer needs a person",
      }),
    ).toHaveAttribute("aria-checked", "true");
    me.user = { handoffEmails: true };
  });
});
