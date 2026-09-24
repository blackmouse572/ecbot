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

// Captures the platform and callbacks so a test can play the popup finishing.
const oauthLogin = vi.hoisted(() => ({
  handleLinkClick: vi.fn(),
  platform: undefined as string | undefined,
  props: undefined as A,
}));
vi.mock("../../hook/use-oauth-login", () => ({
  useOAuthLogin: (platform: string, props: A) => {
    oauthLogin.platform = platform;
    oauthLogin.props = props;
    return { handleLinkClick: oauthLogin.handleLinkClick };
  },
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

describe("AccountCreateForm — WhatsApp Embedded Signup", () => {
  it("offers Facebook login and manual entry as tabs, Facebook first", async () => {
    const user = userEvent.setup();
    render(<AccountCreateForm />);

    await user.click(screen.getByText("WhatsApp"));

    const oauthTab = screen.getByRole("tab", {
      name: "accounts.create.connect.whatsapp.tabs.oauth",
    });
    const manualTab = screen.getByRole("tab", {
      name: "accounts.create.connect.whatsapp.tabs.manual",
    });
    expect(oauthTab.getAttribute("aria-selected")).toBe("true");
    expect(manualTab.getAttribute("aria-selected")).toBe("false");
    expect(
      screen.queryByLabelText(
        "accounts.create.connect.whatsapp.phoneNumberIdLabel",
      ),
    ).toBeNull();
  });

  it("launches the Facebook popup once terms are accepted", async () => {
    const user = userEvent.setup();
    render(<AccountCreateForm />);

    await user.click(screen.getByText("WhatsApp"));
    const connect = screen.getByRole("button", {
      name: "accounts.create.connect.cta",
    });
    expect((connect as HTMLButtonElement).disabled).toBe(true);

    await user.click(screen.getByRole("checkbox"));
    await user.click(connect);

    expect(oauthLogin.platform).toBe("WHATSAPP_BUSINESS");
    expect(oauthLogin.handleLinkClick).toHaveBeenCalled();
  });

  it("links with the code the popup returns", async () => {
    linkMutateAsync.mockResolvedValue({ data: { data: null } });

    const user = userEvent.setup();
    render(<AccountCreateForm />);
    await user.click(screen.getByText("WhatsApp"));

    await oauthLogin.props.onSuccess({ code: "AQBcode" });

    expect(linkMutateAsync).toHaveBeenCalledWith({
      code: "AQBcode",
      platform: "WHATSAPP_BUSINESS",
    });
  });
});

describe("AccountCreateForm — WhatsApp manual credential", () => {
  it("links with the phone number id and token joined into one code", async () => {
    linkMutateAsync.mockResolvedValue({ data: { data: null } });

    const user = userEvent.setup();
    render(<AccountCreateForm />);

    await user.click(screen.getByText("WhatsApp"));
    await user.click(
      screen.getByRole("tab", {
        name: "accounts.create.connect.whatsapp.tabs.manual",
      }),
    );

    await user.type(
      screen.getByLabelText(
        "accounts.create.connect.whatsapp.phoneNumberIdLabel",
      ),
      " 1055 ",
    );
    await user.type(
      screen.getByLabelText("accounts.create.connect.whatsapp.tokenLabel"),
      "EAAtoken",
    );

    await user.click(
      screen.getByRole("button", {
        name: "accounts.create.connect.whatsapp.cta",
      }),
    );

    await vi.waitFor(() =>
      expect(linkMutateAsync).toHaveBeenCalledWith({
        code: "1055:EAAtoken",
        platform: "WHATSAPP_BUSINESS",
      }),
    );
  });
});
