import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// jsdom doesn't ship ResizeObserver, which Radix (used by Medusa UI's
// ProgressTabs) instantiates on mount.
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as A).ResizeObserver =
  (globalThis as A).ResizeObserver ?? ResizeObserverMock;

const linkMutateAsync = vi.fn();

vi.mock("@/hooks/api", () => ({
  useLinkAccount: () => ({ mutateAsync: linkMutateAsync, isPending: false }),
}));

vi.mock("../../hook/use-oauth-login", () => ({
  useOAuthLogin: () => ({ handleLinkClick: vi.fn() }),
}));

// The modal shell provides RouteModalProvider + router blocking that we don't
// exercise here; stub it while keeping the react-hook-form context intact so
// child steps' useFormContext still resolves.
vi.mock("@/components/modals", async () => {
  const React = await vi.importActual<typeof import("react")>("react");
  const rhf =
    await vi.importActual<typeof import("react-hook-form")>("react-hook-form");
  const passthrough = ({ children }: A) => children;
  const RouteFocusModal: A = {
    Form: ({ form, children }: A) =>
      React.createElement(rhf.FormProvider, form, children),
    Header: passthrough,
    Body: passthrough,
  };
  return {
    RouteFocusModal,
    useRouteModal: () => ({ handleSuccess: vi.fn() }),
  };
});

// t interpolates the {{error}} slot so the toast message carries the real error.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { error?: string }) =>
      opts?.error ? `${key} ${opts.error}` : key,
  }),
}));

vi.mock("@medusajs/ui", async () => {
  const actual =
    await vi.importActual<typeof import("@medusajs/ui")>("@medusajs/ui");
  return {
    ...actual,
    toast: { success: vi.fn(), error: vi.fn() },
  };
});

import { toast } from "@medusajs/ui";
import { AccountCreateForm } from "./account-create-form";

const VALID_TELEGRAM_TOKEN = `123456:${"A".repeat(40)}`;

beforeEach(() => {
  linkMutateAsync.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("AccountCreateForm — link failure toast", () => {
  it("surfaces the real error message in the toast when linking fails", async () => {
    linkMutateAsync.mockRejectedValue(new Error("Invalid bot token"));

    const user = userEvent.setup();
    render(<AccountCreateForm />);

    // Pick Telegram — its connect path calls the link mutation directly.
    await user.click(screen.getByText("Telegram"));

    const tokenInput = screen.getByLabelText(
      "accounts.create.connect.telegram.tokenLabel",
    );
    await user.type(tokenInput, VALID_TELEGRAM_TOKEN);

    await user.click(
      screen.getByRole("button", {
        name: "accounts.create.connect.telegram.cta",
      }),
    );

    const errorToast = vi.mocked(toast.error);
    await vi.waitFor(() => expect(errorToast).toHaveBeenCalled());

    const message = errorToast.mock.calls.at(-1)?.[0] as string;
    expect(message).toContain("Invalid bot token");
  });
});
