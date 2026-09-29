import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { VerifyEmailPage } from "./verify-email";

const verifyEmail = vi.fn();

vi.mock("@/hooks/api", () => ({
  useVerifyEmailOtp: () => ({ verifyEmail, isLoading: false }),
  useResendEmailOtp: () => ({ resendEmailOtp: vi.fn(), isLoading: false }),
}));

describe("VerifyEmailPage", () => {
  it("submits on its own once all six digits are entered", async () => {
    render(
      <MemoryRouter initialEntries={["/verify?email=a@b.co&userId=u1"]}>
        <VerifyEmailPage />
      </MemoryRouter>,
    );

    screen.getAllByRole("textbox").forEach((box, i) => {
      fireEvent.change(box, { target: { value: String(i + 1) } });
    });

    await waitFor(() =>
      expect(verifyEmail).toHaveBeenCalledWith("123456", expect.anything()),
    );
  });
});
