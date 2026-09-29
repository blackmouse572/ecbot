import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VerifyEmailPage } from "./verify-email";

const verifyEmail = vi.fn();

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/verify?email=a@b.co&userId=u1"]}>
      <VerifyEmailPage />
    </MemoryRouter>,
  );

const typeCode = () =>
  screen.getAllByRole("textbox").forEach((box, i) => {
    fireEvent.change(box, { target: { value: String(i + 1) } });
  });

vi.mock("@/hooks/api", () => ({
  useVerifyEmailOtp: () => ({ verifyEmail, isLoading: false }),
  useResendEmailOtp: () => ({ resendEmailOtp: vi.fn(), isLoading: false }),
}));

describe("VerifyEmailPage", () => {
  beforeEach(() => {
    verifyEmail.mockReset();
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

    fireEvent.click(
      screen.getByRole("button", { name: "actions.verifyButton" }),
    );

    expect(verifyEmail).toHaveBeenCalledTimes(1);
  });

  it("does not leave a rejected promise unhandled on a wrong code", async () => {
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);
    verifyEmail.mockRejectedValue(new Error("invalid"));
    renderPage();
    typeCode();
    await waitFor(() => expect(verifyEmail).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));
    process.off("unhandledRejection", unhandled);

    expect(unhandled).not.toHaveBeenCalled();
  });
});
