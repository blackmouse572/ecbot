import { render, screen, waitFor } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { MemoryRouter } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import { beforeEach, describe, expect, it, vi } from "vitest";

const exchange = vi.fn();
vi.mock("@repo/client", () => ({
  authPublicControllerImpersonateExchangeV1: (...a: unknown[]) => exchange(...a),
}));
const replaceState = vi.fn();
const replace = vi.fn();
vi.stubGlobal("history", { replaceState } as never);
vi.stubGlobal("location", { replace, search: "" } as never);

import i18n from "@/i18n";
import { impersonationAtom } from "@/modules/impersonation";
import { Component as ImpersonateBootstrap } from "./index";

const renderAt = (search: string, store = createStore()) => {
  (window.location as never as { search: string }).search = search;
  return {
    store,
    ...render(
      <Provider store={store}>
        <I18nextProvider i18n={i18n}>
          <MemoryRouter initialEntries={[`/impersonate${search}`]}>
            <ImpersonateBootstrap />
          </MemoryRouter>
        </I18nextProvider>
      </Provider>,
    ),
  };
};

describe("ImpersonateBootstrap", () => {
  beforeEach(() => {
    exchange.mockReset();
    replaceState.mockReset();
    replace.mockReset();
    sessionStorage.clear();
  });

  it("exchanges the code, sets the atom, strips the query, redirects", async () => {
    exchange.mockResolvedValue({
      data: {
        data: {
          tokenType: "Bearer",
          roleType: "USER",
          expiresIn: 600,
          accessToken: "imp-jwt",
          impersonatedBy: "admin-1",
          user: { id: "u1", name: "A", email: "a@x.com" },
        },
      },
      error: undefined,
    });
    const { store } = renderAt("?code=abc");

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(exchange).toHaveBeenCalledWith({
      body: { code: "abc" },
      throwOnError: false,
    });
    const s = store.get(impersonationAtom);
    expect(s?.accessToken).toBe("imp-jwt");
    expect(s?.expiresAt).toBeGreaterThan(Date.now());
    expect(replaceState).toHaveBeenCalled();
  });

  it("shows the error view for a missing code", async () => {
    renderAt("");
    expect(
      await screen.findByText(i18n.t("impersonation.error.title")),
    ).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("shows the error view when exchange fails", async () => {
    exchange.mockResolvedValue({ data: undefined, error: { message: "gone" } });
    renderAt("?code=dead");
    expect(
      await screen.findByText(i18n.t("impersonation.error.title")),
    ).toBeInTheDocument();
  });
});
