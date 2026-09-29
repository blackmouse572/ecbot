import "@/i18n";
import { fireEvent, render, screen } from "@testing-library/react";
import { forwardRef, useImperativeHandle } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const verifyFailure = vi.hoisted(() => ({ error: undefined as unknown }));
const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));

vi.mock("@/hooks/api", () => ({
  useVerifyEmailOtp: () => ({
    verifyEmail: (
      _otp: string,
      { onError }: { onError: (e: unknown) => void },
    ) => onError(verifyFailure.error),
    isLoading: false,
  }),
  useResendEmailOtp: () => ({
    resendEmailOtp: async () => {},
    isLoading: false,
  }),
}));

vi.mock("@medusajs/ui", async () => {
  const actual =
    await vi.importActual<typeof import("@medusajs/ui")>("@medusajs/ui");
  return { ...actual, toast };
});

vi.mock("@repo/auth/components", () => ({
  VerifyEmailForm: forwardRef((_props, ref) => {
    useImperativeHandle(ref, () => ({ submit: () => ({ otp: "123456" }) }));
    return null;
  }),
}));

import { VerifyEmailPage } from "./verify-email";

const apiError = (statusCode: number, message: string) =>
  Object.assign(new Error("Request failed with status code 400"), {
    response: { status: 400, data: { statusCode, message } },
  });

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/verify-email?email=a@b.com&userId=u1"]}>
      <VerifyEmailPage />
    </MemoryRouter>,
  );

describe("VerifyEmailPage", () => {
  beforeEach(() => toast.error.mockReset());

  it("tells the user an expired code has expired, not that it is invalid", () => {
    verifyFailure.error = apiError(
      5061,
      "This code has expired. Tap Resend to get a new one.",
    );
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Verify" }));

    expect(toast.error).toHaveBeenCalledWith(
      "This code has expired. Tap Resend to get a new one.",
    );
  });

  it("falls back to the invalid-code message when the API sends no reason", () => {
    verifyFailure.error = new Error("Network Error");
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Verify" }));

    expect(toast.error).toHaveBeenCalledWith("Invalid verification code.");
  });
});
