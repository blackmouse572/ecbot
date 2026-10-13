import { FocusModal } from "@medusajs/ui";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { beforeEach, describe, expect, it, vi } from "vitest";

const endImpersonation = vi.fn();
const impersonation = {
  current: null as null | {
    accessToken: string;
    expiresAt: number;
    impersonatedBy: string;
    user: { id: string; name: string; email: string };
  },
};
vi.mock("@/modules/impersonation", () => ({
  useImpersonation: () => impersonation.current,
  useEndImpersonation: () => endImpersonation,
  useImpersonationRefresh: () => undefined,
}));

import i18n from "@/i18n";
import { ImpersonationBanner } from "./impersonation-banner";

const renderBanner = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <ImpersonationBanner />
    </I18nextProvider>,
  );

describe("ImpersonationBanner", () => {
  beforeEach(() => {
    endImpersonation.mockReset();
    sessionStorage.clear();
    impersonation.current = null;
  });

  it("renders nothing when not impersonating", () => {
    const { container } = renderBanner();
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the user and label, and Exit ends the session", () => {
    impersonation.current = {
      accessToken: "jwt",
      expiresAt: Date.now() + 300_000,
      impersonatedBy: "admin-1",
      user: { id: "u1", name: "Nguyen Van A", email: "a@example.com" },
    };
    renderBanner();

    expect(
      screen.getByText(i18n.t("impersonation.banner.label")),
    ).toBeInTheDocument();
    expect(screen.getByText(/Nguyen Van A/)).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: i18n.t("impersonation.banner.exit") }),
    );
    expect(endImpersonation).toHaveBeenCalledWith();
  });

  it("stays clickable over an open dialog without closing it", async () => {
    impersonation.current = {
      accessToken: "jwt",
      expiresAt: Date.now() + 300_000,
      impersonatedBy: "admin-1",
      user: { id: "u1", name: "Nguyen Van A", email: "a@example.com" },
    };
    const onOpenChange = vi.fn();
    render(
      <I18nextProvider i18n={i18n}>
        <ImpersonationBanner />
        <FocusModal open onOpenChange={onOpenChange}>
          <FocusModal.Content>
            <FocusModal.Title>Dialog</FocusModal.Title>
          </FocusModal.Content>
        </FocusModal>
      </I18nextProvider>,
    );

    // Radix registers its click-outside listener on the next tick.
    await new Promise((r) => setTimeout(r, 0));
    // A modal dialog sets pointer-events: none on <body> (and aria-hidden on
    // everything outside it); userEvent refuses to click an element that
    // inherits pointer-events: none, just like a real browser.
    await userEvent.click(
      screen.getByRole("button", {
        name: i18n.t("impersonation.banner.exit"),
        hidden: true,
      }),
    );

    // Dragging the banner must not count as a click outside the dialog.
    await userEvent.click(screen.getByText(/Nguyen Van A/));

    expect(endImpersonation).toHaveBeenCalledWith();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("shows no countdown (the session renews in the background)", () => {
    impersonation.current = {
      accessToken: "jwt",
      expiresAt: Date.now() + 2_000,
      impersonatedBy: "admin-1",
      user: { id: "u1", name: "Nguyen Van A", email: "a@example.com" },
    };
    renderBanner();

    expect(screen.queryByText(/\d+:\d\d/)).not.toBeInTheDocument();
    // nearly-expired tokens must not end the session from the banner either:
    // renewal (or its failure) is the refresh hook's job
    expect(endImpersonation).not.toHaveBeenCalled();
  });

  it("exposes Exit and Minimize as labelled icon buttons", () => {
    impersonation.current = {
      accessToken: "jwt",
      expiresAt: Date.now() + 300_000,
      impersonatedBy: "admin-1",
      user: { id: "u1", name: "Nguyen Van A", email: "a@example.com" },
    };
    renderBanner();

    const exit = screen.getByRole("button", {
      name: i18n.t("impersonation.banner.exit"),
    });
    const minimize = screen.getByRole("button", {
      name: i18n.t("impersonation.banner.minimize"),
    });
    // icon-only: the visible text is not the label
    expect(exit).toHaveTextContent("");
    expect(minimize).toHaveTextContent("");
    expect(exit.querySelector("svg")).not.toBeNull();
    expect(minimize.querySelector("svg")).not.toBeNull();
  });

  it("minimizes to a pill and restores, persisting the choice", () => {
    impersonation.current = {
      accessToken: "jwt",
      expiresAt: Date.now() + 300_000,
      impersonatedBy: "admin-1",
      user: { id: "u1", name: "A", email: "a@x.com" },
    };
    renderBanner();

    fireEvent.click(
      screen.getByRole("button", {
        name: i18n.t("impersonation.banner.minimize"),
      }),
    );
    expect(
      screen.queryByRole("button", {
        name: i18n.t("impersonation.banner.exit"),
      }),
    ).not.toBeInTheDocument();
    expect(sessionStorage.getItem("impersonation-banner-ui")).toContain(
      "minimized",
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: i18n.t("impersonation.banner.expand"),
      }),
    );
    expect(
      screen.getByRole("button", {
        name: i18n.t("impersonation.banner.exit"),
      }),
    ).toBeInTheDocument();
  });

  it("does not expand the minimized pill when a drag ends in a click", () => {
    impersonation.current = {
      accessToken: "jwt",
      expiresAt: Date.now() + 300_000,
      impersonatedBy: "admin-1",
      user: { id: "u1", name: "A", email: "a@x.com" },
    };
    sessionStorage.setItem(
      "impersonation-banner-ui",
      JSON.stringify({ x: 0, minimized: true }),
    );
    renderBanner();
    const pill = screen.getByRole("button", {
      name: i18n.t("impersonation.banner.expand"),
    });

    fireEvent.pointerDown(pill, { clientX: 100, pointerId: 1 });
    fireEvent.pointerMove(pill, { clientX: 160, pointerId: 1 });
    fireEvent.pointerUp(pill, { clientX: 160, pointerId: 1 });
    fireEvent.click(pill);

    expect(
      screen.getByRole("button", {
        name: i18n.t("impersonation.banner.expand"),
      }),
    ).toBeInTheDocument();

    // A plain tap still expands.
    fireEvent.pointerDown(pill, { clientX: 100, pointerId: 1 });
    fireEvent.pointerUp(pill, { clientX: 100, pointerId: 1 });
    fireEvent.click(pill);
    expect(
      screen.getByRole("button", {
        name: i18n.t("impersonation.banner.exit"),
      }),
    ).toBeInTheDocument();
  });
});
