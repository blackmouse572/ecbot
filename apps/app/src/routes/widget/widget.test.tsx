import i18n from "@/i18n";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { Widget } from "./widget";

const meta = vi.hoisted(() => ({ error: undefined as unknown }));

vi.mock("@repo/client", () => ({
  widgetPublicControllerMetaV1: vi.fn(async () => {
    throw meta.error;
  }),
}));

vi.mock("./use-widget-theme", () => ({ useWidgetTheme: () => undefined }));

vi.mock("@repo/auth/components", () => ({
  TurnstileField: () => null,
  useTurnstile: () => ({ token: undefined }),
}));

function renderWidget() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <I18nextProvider i18n={i18n}>
        <MemoryRouter initialEntries={["/widget/key-1"]}>
          <Routes>
            <Route path="/widget/:key" element={<Widget />} />
          </Routes>
        </MemoryRouter>
      </I18nextProvider>
    </QueryClientProvider>,
  );
}

// #255: a new widget has no agent until the owner attaches one.
describe("Widget unavailable", () => {
  it("says the chat is not set up yet when no agent is attached", async () => {
    await i18n.changeLanguage("en");
    meta.error = { response: { status: 422, data: { statusCode: 5513 } } };

    renderWidget();

    expect(
      await screen.findByText("This chat is not set up yet."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Check the widget key/)).not.toBeInTheDocument();
  });

  it("still calls an unknown key unavailable", async () => {
    await i18n.changeLanguage("en");
    meta.error = { response: { status: 404, data: { statusCode: 5510 } } };

    renderWidget();

    expect(
      await screen.findByText("This chat is not available."),
    ).toBeInTheDocument();
  });
});
