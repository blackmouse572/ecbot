import {
  act,
  fireEvent,
  render as rtlRender,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const render = (ui: ReactElement) =>
  rtlRender(<MemoryRouter>{ui}</MemoryRouter>);

const navigateSpy = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom",
    );
  return { ...actual, useNavigate: () => navigateSpy };
});

vi.mock("react-i18next", async () => {
  const actual =
    await vi.importActual<typeof import("react-i18next")>("react-i18next");
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => key,
      i18n: { language: "en" },
    }),
    Trans: ({ i18nKey }: { i18nKey: string }) => <span>{i18nKey}</span>,
  };
});

const { requestReset, setNextError } = vi.hoisted(() => {
  let nextError: unknown = null;
  return {
    setNextError: (error: unknown) => {
      nextError = error;
    },
    requestReset: vi.fn(async (_email: string) => {
      if (nextError) throw nextError;
    }),
  };
});

vi.mock("@/hooks/api", () => ({
  useRequestPasswordReset: () => ({ requestReset, isLoading: false }),
}));

import { RESEND_COOLDOWN_SECONDS } from "../constants";
import { ForgotPasswordPage } from "./forgot-password";

const fillAndSubmit = () => {
  fireEvent.change(screen.getByPlaceholderText("fields.email"), {
    target: { value: "person@example.com" },
  });
  fireEvent.submit(document.querySelector("form")!);
};

describe("ForgotPasswordPage", () => {
  beforeEach(() => {
    setNextError(null);
    requestReset.mockClear();
    navigateSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows the check-your-email state on success and never navigates with a token", async () => {
    render(<ForgotPasswordPage />);

    fillAndSubmit();

    await waitFor(() => expect(requestReset).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByText("checkEmail.title")).toBeTruthy(),
    );
    expect(screen.queryByPlaceholderText("fields.email")).toBeNull();
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it("shows the identical check-your-email state when the request is rejected", async () => {
    setNextError({ message: "http.serverError.internalServerError" });
    render(<ForgotPasswordPage />);

    fillAndSubmit();

    await waitFor(() => expect(requestReset).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByText("checkEmail.title")).toBeTruthy(),
    );
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it("offers Resend only after the countdown, then sends to the same email again", async () => {
    // Advances on its own too, so waitFor still polls.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      render(<ForgotPasswordPage />);
      fillAndSubmit();
      await waitFor(() =>
        expect(screen.getByText("checkEmail.title")).toBeTruthy(),
      );

      const waiting = screen.getByRole("button", {
        name: "checkEmail.resendIn",
      });
      expect(waiting).toBeDisabled();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(RESEND_COOLDOWN_SECONDS * 1000);
      });
      const resend = screen.getByRole("button", { name: "checkEmail.resend" });
      expect(resend).toBeEnabled();

      await act(async () => {
        fireEvent.click(resend);
      });

      expect(requestReset).toHaveBeenCalledTimes(2);
      expect(requestReset).toHaveBeenLastCalledWith("person@example.com");
      expect(
        screen.getByRole("button", { name: "checkEmail.resendIn" }),
      ).toBeDisabled();
    } finally {
      vi.useRealTimers();
    }
  });
});
