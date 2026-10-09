import { HONEYPOT_FIELD_NAME, LoginForm } from "@repo/auth/components";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const MESSAGES = { emailPlaceholder: "Email", passwordPlaceholder: "Password" };

const fillCredentials = () => {
  fireEvent.change(screen.getByPlaceholderText("Email"), {
    target: { value: "person@example.com" },
  });
  fireEvent.change(screen.getByPlaceholderText("Password"), {
    target: { value: "sup3rsecret" },
  });
};

describe("auth form honeypot", () => {
  it("submits normally when the decoy is left alone", async () => {
    const onSubmit = vi.fn(async () => {});
    render(
      <LoginForm locale="en" onSubmit={onSubmit} messages={MESSAGES} id="f" />,
    );

    fillCredentials();
    fireEvent.submit(document.querySelector("form")!);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  });

  it("drops the submission when a bot fills the decoy", async () => {
    const onSubmit = vi.fn(async () => {});
    const { container } = render(
      <LoginForm locale="en" onSubmit={onSubmit} messages={MESSAGES} id="f" />,
    );

    fillCredentials();
    const decoy = container.querySelector<HTMLInputElement>(
      `input[name="${HONEYPOT_FIELD_NAME}"]`,
    )!;
    fireEvent.change(decoy, { target: { value: "http://spam.example" } });
    fireEvent.submit(container.querySelector("form")!);

    // Give the resolver a tick; the handler must still never fire.
    await new Promise((r) => setTimeout(r, 50));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("keeps the decoy away from people and assistive tech", () => {
    const { container } = render(
      <LoginForm locale="en" onSubmit={vi.fn()} messages={MESSAGES} id="f" />,
    );

    const decoy = container.querySelector<HTMLInputElement>(
      `input[name="${HONEYPOT_FIELD_NAME}"]`,
    )!;
    expect(decoy).toBeTruthy();
    expect(decoy.tabIndex).toBe(-1);
    expect(decoy.getAttribute("autocomplete")).toBe("off");
    expect(decoy.closest("[aria-hidden='true']")).toBeTruthy();
  });

  // A filled decoy drops the submit silently, so if a browser or password
  // manager autofills it, a real person clicks submit and nothing happens.
  it("keeps browser autofill and password managers out of the decoy", () => {
    const { container } = render(
      <LoginForm locale="en" onSubmit={vi.fn()} messages={MESSAGES} id="f" />,
    );

    const decoy = container.querySelector<HTMLInputElement>(
      `input[name="${HONEYPOT_FIELD_NAME}"]`,
    )!;
    // Chrome's autofill heuristics match names like website, url, email,
    // phone or company and ignore autocomplete="off" for them.
    expect(HONEYPOT_FIELD_NAME).not.toMatch(
      /web|url|site|mail|phone|tel|name|company|address|city|zip|postal/i,
    );
    expect(decoy.getAttribute("data-1p-ignore")).not.toBeNull();
    expect(decoy.getAttribute("data-lpignore")).toBe("true");
    expect(decoy.getAttribute("data-bwignore")).not.toBeNull();
    expect(decoy.getAttribute("data-form-type")).toBe("other");
  });
});
