import i18n from "@/i18n";
import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import { WidgetAiNotice } from "./widget-ai-notice";

// EU AI Act Art 50 / GDPR Art 13: a visitor is told up front that an AI
// answers, and where to read how their messages are handled.
describe("WidgetAiNotice", () => {
  it.each([
    [
      "en",
      /chatting with an AI\./,
      "Privacy Policy",
      "/en/docs/legal/privacy-policy",
    ],
    [
      "vi",
      /trò chuyện với AI\./,
      "Chính sách quyền riêng tư",
      "/vi/docs/legal/privacy-policy",
    ],
  ])(
    "%s: says it is an AI and links the privacy policy",
    async (lang, text, linkName, path) => {
      await i18n.changeLanguage(lang);
      render(
        <I18nextProvider i18n={i18n}>
          <WidgetAiNotice />
        </I18nextProvider>,
      );

      expect(screen.getByText(text)).toBeInTheDocument();
      const link = screen.getByRole("link", { name: linkName });
      expect(link.getAttribute("href")?.endsWith(path)).toBe(true);
      expect(link).toHaveAttribute("target", "_blank");
    },
  );
});
