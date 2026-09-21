import { LoginForm } from "@repo/auth/components";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const reset = vi.fn();
/** Controls whether the stubbed widget issues a token on mount. */
let issuesToken = true;
/** Set on every render so a test can trigger a delayed resolve manually. */
let lastOnSuccess: ((token: string) => void) | undefined;

vi.mock("@marsidev/react-turnstile", () => ({
  Turnstile: ({
    onSuccess,
    ref,
  }: {
    onSuccess?: (token: string) => void;
    ref?: { current: unknown };
  }) => {
    if (ref) ref.current = { reset };
    lastOnSuccess = onSuccess;
    if (issuesToken) queueMicrotask(() => onSuccess?.("tok"));
    return <div data-testid="turnstile" />;
  },
}));

const MESSAGES = { emailPlaceholder: "Email", passwordPlaceholder: "Password" };
const TURNSTILE = {
  siteKey: "1x00000000000000000000AA",
  messages: { required: "Complete the verification.", failed: "Failed." },
};

const fillCredentials = () => {
  fireEvent.change(screen.getByPlaceholderText("Email"), {
    target: { value: "person@example.com" },
  });
  fireEvent.change(screen.getByPlaceholderText("Password"), {
    target: { value: "sup3rsecret" },
  });
};

describe("auth form turnstile", () => {
  beforeEach(() => {
    reset.mockClear();
    issuesToken = true;
    lastOnSuccess = undefined;
  });

  it("renders no widget and sends no token when unconfigured", async () => {
    const onSubmit = vi.fn(async () => {});
    render(
      <LoginForm locale="en" onSubmit={onSubmit} messages={MESSAGES} id="f" />,
    );

    expect(screen.queryByTestId("turnstile")).toBeNull();

    fillCredentials();
    fireEvent.submit(document.querySelector("form")!);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      turnstileToken: undefined,
    });
  });

  it("forwards the widget token to onSubmit", async () => {
    const onSubmit = vi.fn(async () => {});
    render(
      <LoginForm
        locale="en"
        onSubmit={onSubmit}
        turnstile={TURNSTILE}
        messages={MESSAGES}
        id="f"
      />,
    );

    await screen.findByTestId("turnstile");
    fillCredentials();
    await waitFor(() => expect(document.querySelector("form")).toBeTruthy());
    fireEvent.submit(document.querySelector("form")!);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ turnstileToken: "tok" });
  });

  it("blocks submit and surfaces the message when no token was issued", async () => {
    issuesToken = false;
    const onSubmit = vi.fn(async () => {});
    render(
      <LoginForm
        locale="en"
        onSubmit={onSubmit}
        turnstile={TURNSTILE}
        messages={MESSAGES}
        id="f"
      />,
    );

    fillCredentials();
    fireEvent.submit(document.querySelector("form")!);

    // A too-fast submit now gets a grace period for the widget to solve
    // (see TOKEN_WAIT_TIMEOUT_MS) before the required message shows up.
    expect(
      await screen.findByText(TURNSTILE.messages.required, {}, {
        timeout: 5000,
      }),
    ).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  }, 8000);

  it("submits once the widget resolves after a too-fast submit", async () => {
    issuesToken = false; // widget hasn't solved yet when the user submits
    const onSubmit = vi.fn(async () => {});
    render(
      <LoginForm
        locale="en"
        onSubmit={onSubmit}
        turnstile={TURNSTILE}
        messages={MESSAGES}
        id="f"
      />,
    );

    await screen.findByTestId("turnstile");
    fillCredentials();
    fireEvent.submit(document.querySelector("form")!);

    // Widget finishes solving shortly after the too-fast submit — well
    // inside the grace window, so the pending submit should still go through.
    lastOnSuccess?.("late-tok");

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      turnstileToken: "late-tok",
    });
    expect(screen.queryByText(TURNSTILE.messages.required)).toBeNull();
  });

  it("reports isSubmitting for the whole submit lifecycle, including the turnstile wait", async () => {
    issuesToken = false; // widget hasn't solved yet when the user submits
    const onSubmit = vi.fn(async () => {});
    const onSubmittingChange = vi.fn();
    render(
      <LoginForm
        locale="en"
        onSubmit={onSubmit}
        turnstile={TURNSTILE}
        messages={MESSAGES}
        onSubmittingChange={onSubmittingChange}
        id="f"
      />,
    );

    await screen.findByTestId("turnstile");
    fillCredentials();
    fireEvent.submit(document.querySelector("form")!);

    // Turns on as soon as the submit starts — before the widget has
    // resolved — so a page-level button can disable itself right away.
    await waitFor(() => expect(onSubmittingChange).toHaveBeenCalledWith(true));

    lastOnSuccess?.("late-tok");

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(onSubmittingChange).toHaveBeenLastCalledWith(false),
    );
  });

  it("resets the widget after a failed submit — tokens are single-use", async () => {
    const onSubmit = vi.fn(async () => {
      throw new Error("bad credentials");
    });
    render(
      <LoginForm
        locale="en"
        onSubmit={onSubmit}
        turnstile={TURNSTILE}
        messages={MESSAGES}
        id="f"
      />,
    );

    await screen.findByTestId("turnstile");
    fillCredentials();
    fireEvent.submit(document.querySelector("form")!);

    await waitFor(() => expect(reset).toHaveBeenCalledTimes(1));
  });

  it("clears isSubmitting after a failed submit so the button can be retried", async () => {
    const onSubmit = vi.fn(async () => {
      throw new Error("bad credentials");
    });
    const onSubmittingChange = vi.fn();
    render(
      <LoginForm
        locale="en"
        onSubmit={onSubmit}
        turnstile={TURNSTILE}
        messages={MESSAGES}
        onSubmittingChange={onSubmittingChange}
        id="f"
      />,
    );

    await screen.findByTestId("turnstile");
    fillCredentials();
    fireEvent.submit(document.querySelector("form")!);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    // react-hook-form's own handleSubmit has no try/finally around onValid —
    // if onSubmit's rejection escapes our wrapper unhandled, it never
    // reaches the isSubmitting=false update and the button stays stuck.
    await waitFor(() =>
      expect(onSubmittingChange).toHaveBeenLastCalledWith(false),
    );
  });
});
