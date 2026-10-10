import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mutateAsync, toastError } = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/hooks/api/mfa", () => ({
  useLoginWithMfa: () => ({ mutateAsync, isPending: false }),
}));

vi.mock("@medusajs/ui", async () => {
  const actual =
    await vi.importActual<typeof import("@medusajs/ui")>("@medusajs/ui");
  return { ...actual, toast: { success: vi.fn(), error: toastError } };
});

vi.mock("react-i18next", async () => {
  const actual =
    await vi.importActual<typeof import("react-i18next")>("react-i18next");
  return { ...actual, useTranslation: () => ({ t: (key: string) => key }) };
});

import { LoginMfaStep } from "./login-mfa-step";

describe("LoginMfaStep", () => {
  beforeEach(() => {
    mutateAsync.mockReset();
    toastError.mockReset();
  });

  it("sends a recovery code with the challenge token and passes on the access token", async () => {
    mutateAsync.mockResolvedValue({ accessToken: "tok" });
    const onSuccess = vi.fn();
    render(
      <LoginMfaStep
        mfaToken="challenge-1"
        onSuccess={onSuccess}
        onRestart={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText("useRecoveryCode"));
    fireEvent.change(screen.getByLabelText("recoveryPlaceholder"), {
      target: { value: " abcde-fghij " },
    });
    fireEvent.click(screen.getByText("verifyButton"));

    await vi.waitFor(() => expect(onSuccess).toHaveBeenCalledWith("tok"));
    expect(mutateAsync).toHaveBeenCalledWith({
      mfaToken: "challenge-1",
      code: "abcde-fghij",
    });
  });

  it("goes back to the password step when the challenge has expired", async () => {
    mutateAsync.mockRejectedValue({
      response: {
        status: 401,
        data: { statusCode: 5021, message: "expired" },
      },
    });
    const onRestart = vi.fn();
    render(
      <LoginMfaStep
        mfaToken="challenge-1"
        onSuccess={vi.fn()}
        onRestart={onRestart}
      />,
    );

    fireEvent.click(screen.getByText("useRecoveryCode"));
    fireEvent.change(screen.getByLabelText("recoveryPlaceholder"), {
      target: { value: "abcde-fghij" },
    });
    fireEvent.click(screen.getByText("verifyButton"));

    await vi.waitFor(() => expect(onRestart).toHaveBeenCalled());
    expect(toastError).toHaveBeenCalledWith("expired");
  });
});
