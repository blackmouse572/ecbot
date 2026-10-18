import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const prompt = vi.fn(async () => false);

vi.mock("@medusajs/ui", async () => {
  const actual =
    await vi.importActual<typeof import("@medusajs/ui")>("@medusajs/ui");
  return { ...actual, usePrompt: () => prompt };
});

vi.mock("@/hooks/api", () => ({
  useDeleteProfile: () => ({ deleteProfile: vi.fn() }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import { ProfileDeleteSection } from "./profile-delete-section";

describe("ProfileDeleteSection", () => {
  // Medusa's prompt falls back to English "Please type ... to confirm:" and
  // "Cancel" unless both are passed in.
  it("passes translated verification and cancel labels to the prompt", () => {
    render(<ProfileDeleteSection user={{ email: "a@b.co" } as never} />);

    fireEvent.click(screen.getByRole("button"));

    expect(prompt).toHaveBeenCalledWith(
      expect.objectContaining({
        verificationText: "a@b.co",
        verificationInstruction: "general.typeToConfirm",
        cancelText: "actions.cancel",
      }),
    );
  });
});
