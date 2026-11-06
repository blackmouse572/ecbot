import { RegisterForm } from "@repo/auth/components";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const reset = vi.fn();
/** How the stubbed widget behaves once mounted. */
let widget: "errors" | "silent" = "errors";

vi.mock("@marsidev/react-turnstile", () => ({
  Turnstile: ({
    onError,
    ref,
  }: {
    onError?: () => void;
    ref?: { current: unknown };
  }) => {
    if (ref) ref.current = { reset };
    if (widget === "errors") queueMicrotask(() => onError?.());
    return <div data-testid="turnstile" />;
  },
}));

const MESSAGES = {
  emailPlaceholder: "Email",
  namePlaceholder: "Name",
  referralCodePlaceholder: "Referral code",
  countryPlaceholder: "Country",
  passwordPlaceholder: "Password",
  confirmPassword: {
    placeholder: "Confirm password",
    error: { notMatchPassword: "Passwords do not match" },
  },
  acceptTerms: {
    label: "I agree to the terms",
    required: "Please accept the terms to continue.",
  },
  invalid: "Some details are missing or invalid.",
};

const TURNSTILE = {
  siteKey: "1x00000000000000000000AA",
  messages: {
    required: "Please complete the verification.",
    failed: "Verification failed. Please try again.",
    unavailable:
      "Security check could not load. Disable blockers or try again.",
    retry: "Try again",
  },
};

const renderAndFill = ({
  countries = [{ label: "Vietnam", value: "vn" }],
  withTurnstile = true,
} = {}) => {
  const onSubmit = vi.fn(async () => {});
  const { container } = render(
    <RegisterForm
      id="f"
      locale="en"
      countries={countries}
      messages={MESSAGES}
      turnstile={withTurnstile ? TURNSTILE : undefined}
      onSubmit={onSubmit}
    />,
  );
  const type = (placeholder: string, value: string) =>
    fireEvent.change(screen.getByPlaceholderText(placeholder), {
      target: { value },
    });
  type("Email", "lan@shop.vn");
  type("Name", "Lan");
  type("Password", "sup3rsecret");
  type("Confirm password", "sup3rsecret");
  const select = container.querySelector("select");
  if (select) fireEvent.change(select, { target: { value: "vn" } });
  fireEvent.click(
    screen.getByRole("checkbox", { name: MESSAGES.acceptTerms.label }),
  );
  return { onSubmit, form: container.querySelector("form")! };
};

// QA gate D8: with the security check broken, "Create new account" did
// nothing at all. Every blocked submit must say why and offer a way out.
describe("RegisterForm never swallows a submit", () => {
  beforeEach(() => {
    reset.mockClear();
    widget = "errors";
    // The widget script loaded, so a retry resets it instead of reloading.
    Object.assign(window, { turnstile: {} });
  });

  it("says the security check could not load and offers a retry when the widget errored", async () => {
    const { onSubmit, form } = renderAndFill();
    await screen.findByTestId("turnstile");

    fireEvent.submit(form);

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      expect.stringContaining(TURNSTILE.messages.unavailable),
    );
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("says the security check could not load when the widget never answers", async () => {
    widget = "silent";
    const { onSubmit, form } = renderAndFill();

    fireEvent.submit(form);

    expect(
      await screen.findByText(
        TURNSTILE.messages.unavailable,
        {},
        { timeout: 5000 },
      ),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  }, 8000);

  it("surfaces a validation failure on a field that is not on screen", async () => {
    // The country list failed to load, so no picker renders and country
    // stays empty: the schema rejects it with nowhere to show the error.
    const { onSubmit, form } = renderAndFill({
      countries: [],
      withTurnstile: false,
    });

    fireEvent.submit(form);

    expect(await screen.findByText(MESSAGES.invalid)).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits normally once everything is valid", async () => {
    const { onSubmit, form } = renderAndFill({ withTurnstile: false });

    fireEvent.submit(form);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(MESSAGES.invalid)).toBeNull();
  });
});
