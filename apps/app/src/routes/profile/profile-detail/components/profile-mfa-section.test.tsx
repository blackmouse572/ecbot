import "@/i18n";
import { TooltipProvider } from "@medusajs/ui";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { startSetup, enable, disable, regenerate } = vi.hoisted(() => ({
  startSetup: vi.fn(),
  enable: vi.fn(),
  disable: vi.fn(),
  regenerate: vi.fn(),
}));

vi.mock("@/hooks/api/mfa", () => ({
  useMfaSetup: () => ({ mutateAsync: startSetup, isPending: false }),
  useMfaEnable: () => ({ mutateAsync: enable, isPending: false }),
  useMfaDisable: () => ({ mutateAsync: disable, isPending: false }),
  useMfaRegenerateRecoveryCodes: () => ({
    mutateAsync: regenerate,
    isPending: false,
  }),
}));

import { ProfileMfaSection } from "./profile-mfa-section";

const user = (mfaEnabled: boolean) => ({ mfaEnabled }) as never;

// The copy buttons show a tooltip.
const renderSection = (mfaEnabled: boolean) =>
  render(
    <TooltipProvider>
      <ProfileMfaSection user={user(mfaEnabled)} />
    </TooltipProvider>,
  );

const typePassword = (value: string) =>
  fireEvent.change(screen.getByLabelText("Current password"), {
    target: { value },
  });

describe("ProfileMfaSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("asks for the password before setup, then shows a QR code and the setup key", async () => {
    startSetup.mockResolvedValue({
      secret: "FAKEKEY",
      otpauthUri: "otpauth://totp/Eccho:a?secret=FAKEKEY",
    });
    renderSection(false);

    fireEvent.click(screen.getByRole("button", { name: "Turn on" }));
    typePassword("pass");
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => expect(startSetup).toHaveBeenCalledWith("pass"));
    expect(
      await screen.findByRole("img", {
        name: "QR code for your authenticator app",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("FAKEKEY")).toBeInTheDocument();
  });

  it("creates new recovery codes with the password and a code, then shows them", async () => {
    regenerate.mockResolvedValue({ recoveryCodes: ["aaaa-bbbb-cccc-dddd"] });
    renderSection(true);

    fireEvent.click(screen.getByRole("button", { name: "New recovery codes" }));
    typePassword("pass");
    fireEvent.change(screen.getByLabelText("Authenticator or recovery code"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create codes" }));

    await waitFor(() =>
      expect(regenerate).toHaveBeenCalledWith({
        password: "pass",
        code: "123456",
      }),
    );
    expect(await screen.findByText("aaaa-bbbb-cccc-dddd")).toBeInTheDocument();
  });
});
