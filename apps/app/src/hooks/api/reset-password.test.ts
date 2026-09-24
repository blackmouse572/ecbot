import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const TOKEN = "reset-token-123";

const requestV1 = vi.fn();
const getV1 = vi.fn();
const verifyV1 = vi.fn();
const resetV1 = vi.fn();

vi.mock("@repo/client", () => ({
  resetPasswordPublicControllerRequestV1: (...args: A[]) => requestV1(...args),
  resetPasswordPublicControllerGetV1: (...args: A[]) => getV1(...args),
  resetPasswordPublicControllerVerifyV1: (...args: A[]) => verifyV1(...args),
  resetPasswordPublicControllerResetV1: (...args: A[]) => resetV1(...args),
}));

import {
  useRequestPasswordReset,
  useResetPassword,
  useResetPasswordToken,
  useVerifyPasswordResetOtp,
} from "./reset-password";

const wrap = <T>(hook: () => T) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: PropsWithChildren) =>
    createElement(QueryClientProvider, { client }, children);

  return renderHook(hook, { wrapper });
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useRequestPasswordReset", () => {
  it("resolves without returning a token — the API never puts one on this response", async () => {
    requestV1.mockResolvedValue({ data: { data: undefined } });

    const { result } = wrap(() => useRequestPasswordReset());
    const created = await result.current.requestReset("a@b.com");

    expect(requestV1).toHaveBeenCalledWith(
      expect.objectContaining({ body: { email: "a@b.com" } }),
    );
    expect(created).toBeUndefined();
  });

  it("still rejects on a genuine transport/server error, for the caller to fall back to the generic state", async () => {
    requestV1.mockResolvedValue({
      error: { message: "http.serverError.internalServerError" },
    });

    const { result } = wrap(() => useRequestPasswordReset());

    await expect(result.current.requestReset("a@b.com")).rejects.toEqual({
      message: "http.serverError.internalServerError",
    });
  });
});

describe("useResetPasswordToken", () => {
  it("reports an expired token as an error so the page can offer a fresh link", async () => {
    getV1.mockResolvedValue({
      error: { message: "resetPassword.error.expired" },
    });

    const { result } = wrap(() => useResetPasswordToken(TOKEN));

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("does not fire without a token", () => {
    wrap(() => useResetPasswordToken(""));

    expect(getV1).not.toHaveBeenCalled();
  });
});

describe("useVerifyPasswordResetOtp", () => {
  it("sends the otp against the token", async () => {
    verifyV1.mockResolvedValue({ data: { data: null } });

    const { result } = wrap(() => useVerifyPasswordResetOtp(TOKEN));
    await result.current.verifyOtp("123456");

    expect(verifyV1).toHaveBeenCalledWith(
      expect.objectContaining({
        path: { token: TOKEN },
        body: { otp: "123456" },
      }),
    );
  });

  it("throws on an otp mismatch", async () => {
    verifyV1.mockResolvedValue({
      error: { message: "resetPassword.error.otpNotMatch" },
    });

    const { result } = wrap(() => useVerifyPasswordResetOtp(TOKEN));

    await expect(result.current.verifyOtp("000000")).rejects.toEqual({
      message: "resetPassword.error.otpNotMatch",
    });
  });
});

describe("useResetPassword", () => {
  it("posts the new password against the token", async () => {
    resetV1.mockResolvedValue({ data: { data: null } });

    const { result } = wrap(() => useResetPassword(TOKEN));
    await result.current.resetPassword("sup3rsecret");

    expect(resetV1).toHaveBeenCalledWith(
      expect.objectContaining({
        path: { token: TOKEN },
        body: { newPassword: "sup3rsecret" },
      }),
    );
  });

  it("throws when the token expired between verify and reset", async () => {
    resetV1.mockResolvedValue({
      error: { message: "resetPassword.error.expired" },
    });

    const { result } = wrap(() => useResetPassword(TOKEN));

    await expect(result.current.resetPassword("sup3rsecret")).rejects.toEqual({
      message: "resetPassword.error.expired",
    });
  });
});
