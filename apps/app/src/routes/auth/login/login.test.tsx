import { fireEvent, render as rtlRender, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const render = (ui: ReactElement) =>
  rtlRender(<MemoryRouter>{ui}</MemoryRouter>);

const { promptFn, toastError } = vi.hoisted(() => ({
  promptFn: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@medusajs/ui", async () => {
  const actual =
    await vi.importActual<typeof import("@medusajs/ui")>("@medusajs/ui");
  return {
    ...actual,
    toast: { success: vi.fn(), error: toastError },
    usePrompt: () => promptFn,
  };
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

vi.mock("@repo/auth/components", () => ({
  LoginForm: ({
    onSubmit,
  }: {
    onSubmit: (data: { email: string; password: string }) => Promise<void>;
  }) => (
    <button
      type="button"
      onClick={() => onSubmit({ email: "user@x.com", password: "password123" })}
    >
      submit-login
    </button>
  ),
}));

vi.mock("@/modules/auth", () => ({
  useAuth: () => [null, vi.fn()],
}));

vi.mock("../components/social-login", () => ({
  SocialLogin: () => null,
}));

const { mutateAsync, setNextError } = vi.hoisted(() => {
  let nextError: { statusCode?: number; message: string } | null = null;
  return {
    setNextError: (error: typeof nextError) => {
      nextError = error;
    },
    mutateAsync: vi.fn(async (_payload: unknown, options: A) => {
      if (nextError) {
        options?.onError?.(nextError);
      } else {
        options?.onSuccess?.({ accessToken: "tok" });
      }
    }),
  };
});

vi.mock("@/hooks/api/auth", () => ({
  useSignInWithEmailPass: () => ({ mutateAsync, isPending: false }),
  USER_BLOCKED_FORBIDDEN_STATUS_CODE: 5159,
}));

import { LoginPage } from "./login";

describe("LoginPage", () => {
  beforeEach(() => {
    setNextError(null);
    promptFn.mockClear();
    toastError.mockClear();
    mutateAsync.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows an alert modal (usePrompt) when login fails because the user is banned", async () => {
    setNextError({ statusCode: 5159, message: "user.error.blocked" });
    render(<LoginPage />);

    fireEvent.click(screen.getByText("submit-login"));

    await vi.waitFor(() => expect(promptFn).toHaveBeenCalledTimes(1));
    expect(promptFn).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "errors.banned.title",
        description: "errors.banned.description",
        confirmText: "actions.ok",
      }),
    );
    expect(toastError).not.toHaveBeenCalled();
  });

  it("shows a toast (not the alert modal) for a non-banned login error", async () => {
    setNextError({ statusCode: 5157, message: "user.error.inactive" });
    render(<LoginPage />);

    fireEvent.click(screen.getByText("submit-login"));

    await vi.waitFor(() => expect(toastError).toHaveBeenCalledTimes(1));
    expect(toastError).toHaveBeenCalledWith("user.error.inactive");
    expect(promptFn).not.toHaveBeenCalled();
  });
});
