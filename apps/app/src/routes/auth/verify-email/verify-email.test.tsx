import "@/i18n";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const verifyEmail = vi.hoisted(() => vi.fn());
const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
const setAuth = vi.hoisted(() => vi.fn());

vi.mock("@/modules/auth", () => ({
  useAuth: () => [null, setAuth],
}));

vi.mock("@/hooks/api", () => ({
  useVerifyEmailOtp: () => ({ verifyEmail, isLoading: false }),
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

import { VerifyEmailPage } from "./verify-email";

const apiError = (statusCode: number, message: string) =>
  Object.assign(new Error("Request failed with status code 400"), {
    response: { status: 400, data: { statusCode, message } },
  });

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/verify-email?email=a@b.com&userId=u1"]}>
      <Routes>
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/" element={<p>home page</p>} />
        <Route path="/login" element={<p>login page</p>} />
      </Routes>
    </MemoryRouter>,
  );

const typeCode = () =>
  screen.getAllByRole("textbox").forEach((box, i) => {
    fireEvent.change(box, { target: { value: String(i + 1) } });
  });

describe("VerifyEmailPage", () => {
  beforeEach(() => {
    verifyEmail.mockReset();
    toast.error.mockReset();
    setAuth.mockReset();
  });

  it("signs the user in and goes home once the code is verified (#143)", async () => {
    verifyEmail.mockResolvedValue({ accessToken: "at", refreshToken: "rt" });
    renderPage();
    typeCode();

    expect(await screen.findByText("home page")).toBeInTheDocument();
    expect(setAuth).toHaveBeenCalledWith("at");
  });

  it("falls back to the login page when the API signs nobody in", async () => {
    verifyEmail.mockResolvedValue(undefined);
    renderPage();
    typeCode();

    expect(await screen.findByText("login page")).toBeInTheDocument();
    expect(setAuth).not.toHaveBeenCalled();
  });

  it("submits on its own once all six digits are entered", async () => {
    verifyEmail.mockResolvedValue(true);
    renderPage();
    typeCode();

    await waitFor(() => expect(verifyEmail).toHaveBeenCalledWith("123456"));
  });

  it("does not send the code again when Verify is clicked mid-request", async () => {
    verifyEmail.mockReturnValue(new Promise(() => {}));
    renderPage();
    typeCode();
    await waitFor(() => expect(verifyEmail).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: "Verify" }));

    expect(verifyEmail).toHaveBeenCalledTimes(1);
  });

  it("does not leave a rejected promise unhandled on a wrong code", async () => {
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);
    verifyEmail.mockRejectedValue(new Error("invalid"));
    renderPage();
    typeCode();
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));
    process.off("unhandledRejection", unhandled);

    expect(unhandled).not.toHaveBeenCalled();
  });

  it("clears the boxes after a wrong code so the user can retry", async () => {
    verifyEmail.mockRejectedValue(new Error("invalid"));
    renderPage();
    typeCode();

    await waitFor(() =>
      screen
        .getAllByRole("textbox")
        .forEach((box) => expect(box).toHaveValue("")),
    );
  });

  it("tells the user an expired code has expired, not that it is invalid", async () => {
    verifyEmail.mockRejectedValue(
      apiError(5061, "This code has expired. Tap Resend to get a new one."),
    );
    renderPage();
    typeCode();

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "This code has expired. Tap Resend to get a new one.",
      ),
    );
  });

  it("says to wait instead of the throttler's raw message when rate limited", async () => {
    verifyEmail.mockRejectedValue(
      Object.assign(new Error("Too Many Request"), {
        status: 429,
        response: {
          status: 429,
          data: { statusCode: 429, message: "Too Many Request" },
        },
      }),
    );
    renderPage();
    typeCode();

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Too many tries. Wait a minute, then try again.",
      ),
    );
  });

  it("falls back to the invalid-code message when the API sends no reason", async () => {
    verifyEmail.mockRejectedValue(new Error("Network Error"));
    renderPage();
    typeCode();

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Invalid verification code."),
    );
  });
});
