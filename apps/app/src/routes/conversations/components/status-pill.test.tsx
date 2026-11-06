import { TooltipProvider } from "@medusajs/ui";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "vi" } }),
  Trans: ({ i18nKey }: { i18nKey: string }) => <>{i18nKey}</>,
}));

const conversation = (botEnabled: boolean, status = "OPEN") =>
  ({ id: "c1", status, botEnabled, handoffAt: "x" }) as never;

const hover = async (label: string, convo: never) => {
  render(
    <TooltipProvider>
      <StatusPill conversation={convo} />
    </TooltipProvider>,
  );
  await userEvent.hover(screen.getByText(label));
  expect(screen.queryByText(/conversations\.status\.hint\./)).toBeNull();
  await screen.findAllByText(/conversations\.status\.hint\./, undefined, {
    timeout: 3000,
  });
};

import { StatusPill } from "./status-pill";
import en from "@/i18n/translations/en.json";
import viDict from "@/i18n/translations/vi.json";

describe("StatusPill", () => {
  it("explains the status on hover and links to the docs", async () => {
    render(
      <TooltipProvider>
        <StatusPill
          conversation={
            {
              id: "c1",
              status: "OPEN",
              botEnabled: false,
              handoffAt: "x",
            } as never
          }
        />
      </TooltipProvider>,
    );

    await userEvent.hover(screen.getByText("conversations.status.needsYou"));

    // Waits two seconds before explaining, so quick passes stay quiet.
    expect(
      screen.queryByText("conversations.status.hint.needsYou"),
    ).not.toBeInTheDocument();
    expect(
      (
        await screen.findAllByText(
          "conversations.status.hint.needsYou",
          undefined,
          { timeout: 3000 },
        )
      )[0],
    ).toBeInTheDocument();
    const link = screen.getAllByRole("link", {
      name: "conversations.status.learnMore",
    })[0];
    expect(link).toHaveAttribute(
      "href",
      expect.stringMatching(/\/vi\/docs\/customers#conversation-statuses$/),
    );
  });

  it("tells staff to Resolve when the bot is waiting on them", async () => {
    await hover("conversations.status.needsYou", conversation(false));
    expect(
      screen.getAllByText("conversations.status.resolveTip")[0],
    ).toBeInTheDocument();
  });

  it("has no Resolve tip once the bot answers again", async () => {
    await hover(
      "conversations.status.resolved",
      conversation(true, "RESOLVED"),
    );
    expect(
      screen.queryByText("conversations.status.resolveTip"),
    ).not.toBeInTheDocument();
  });

  it("keeps the label on one line next to other row content", () => {
    render(
      <TooltipProvider>
        <StatusPill conversation={conversation(false)} />
      </TooltipProvider>,
    );
    const pill = screen.getByText("conversations.status.needsYou");
    expect(pill.closest(".whitespace-nowrap")).not.toBeNull();
    expect(pill.closest(".shrink-0")).not.toBeNull();
  });

  it("uses short vi labels that fit one line, and leaves en as is", () => {
    expect(viDict.conversations.status).toMatchObject({
      needsYou: "Chờ bạn",
      botActive: "Bot trả lời",
      youHandling: "Bạn đang xử lý",
      resolved: "Đã xử lý",
    });
    expect(en.conversations.status).toMatchObject({
      needsYou: "Needs you",
      botActive: "Bot active",
      youHandling: "You're handling",
      resolved: "Resolved",
    });
  });
});
