import { LoginForm } from "@repo/auth/components";
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
      'input[name="website"]',
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
      'input[name="website"]',
    )!;
    expect(decoy).toBeTruthy();
    expect(decoy.tabIndex).toBe(-1);
    expect(decoy.getAttribute("autocomplete")).toBe("off");
    expect(decoy.closest("[aria-hidden='true']")).toBeTruthy();
  });
});
