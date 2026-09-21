import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "@/i18n";
import { ClientProvider } from "./client-provider";

const setConfig = vi.fn();

vi.mock("@repo/client", () => ({
  client: { setConfig: (...args: unknown[]) => setConfig(...args) },
}));

function renderProvider() {
  return render(
    <I18nextProvider i18n={i18n}>
      <ClientProvider>
        <div data-testid="child" />
      </ClientProvider>
    </I18nextProvider>,
  );
}

describe("ClientProvider", () => {
  beforeEach(() => {
    setConfig.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // Auth is no longer gated here — the token is read synchronously off the
  // (localStorage-backed) atom by the request interceptor, and the 401
  // response interceptor owns recovering an expired one. ClientProvider's
  // only remaining job is keeping the locale header in sync.
  it("renders children immediately, with no spinner/auth gate", () => {
    renderProvider();

    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("sets the locale header on mount", () => {
    renderProvider();

    const config = setConfig.mock.calls.at(-1)?.[0];
    expect(config.headers).toHaveProperty("x-custom-lang");
    expect(config.throwOnError).toBe(true);
  });

  it("never touches Authorization — that's the request interceptor's job", () => {
    renderProvider();

    for (const call of setConfig.mock.calls) {
      expect(call[0].headers).not.toHaveProperty("Authorization");
    }
  });
});
