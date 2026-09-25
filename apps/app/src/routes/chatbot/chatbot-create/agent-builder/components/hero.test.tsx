import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));

import { Hero } from "./hero";

const renderHero = (loading: boolean) => render(<Hero loading={loading} onDescribe={vi.fn()} onTemplate={vi.fn()} />);

describe("Hero", () => {
  it("lets the ScrollArea's inner wrapper fill the height so the hero can center", () => {
    renderHero(false);
    const viewport = screen.getByRole("heading", { name: "agentBuilder.ui.heroTitle" }).closest('[data-slot="scroll-area-viewport"]');
    expect(viewport).toHaveClass("[&>div]:!h-full");
  });

  it("disables the template cards while a suggestion is loading", () => {
    renderHero(true);
    expect(screen.getByRole("button", { name: "agentBuilder.types.beauty" })).toBeDisabled();
  });

  it("enables the template cards otherwise", () => {
    renderHero(false);
    expect(screen.getByRole("button", { name: "agentBuilder.types.beauty" })).toBeEnabled();
  });
});
