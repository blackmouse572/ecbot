import i18n from "@/i18n";
import { buildQuestionGroups, createProfile, type AgentProfile, summarizeAnswer } from "@repo/agent-blueprint";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { QuestionTurn } from "./question-turn";

const hoursQuestion = (profile: AgentProfile) =>
  buildQuestionGroups(profile).flatMap((g) => g.questions).find((q) => q.id === "openingHours")!;

const renderTurn = (profile: AgentProfile, onAnswer = vi.fn()) => {
  render(
    <QuestionTurn
      question={hoursQuestion(profile)}
      profile={profile}
      suggestion={null}
      position={{ current: 1, total: 20 }}
      onAnswer={onAnswer}
      onSkip={vi.fn()}
      chatbotId={null}
      linkedAccounts={[]}
      onAccountsLinked={vi.fn()}
      onAccountsUnlinked={vi.fn()}
    />,
  );
  return onAnswer;
};

describe("opening hours question", () => {
  beforeAll(() => i18n.changeLanguage("en"));

  it("opens a day with default hours, copies it to every day and saves the week", async () => {
    const onAnswer = renderTurn(createProfile("restaurant", "en"));
    await userEvent.click(screen.getByRole("switch", { name: "Monday" }));
    await userEvent.click(screen.getByRole("button", { name: "Use these hours every day" }));
    await userEvent.click(screen.getByRole("switch", { name: "Sunday" }));
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    const saved = onAnswer.mock.calls[0]![0];
    expect(saved.mon).toEqual([{ open: "08:00", close: "17:00" }]);
    expect(saved.sat).toEqual([{ open: "08:00", close: "17:00" }]);
    expect(saved.sun).toEqual([]);
  });

  it("shows an error and does not save backwards hours", async () => {
    const profile = { ...createProfile("restaurant", "en"), openingHours: { mon: [{ open: "08:00", close: "17:00" }] } };
    const onAnswer = renderTurn(profile);
    fireEvent.change(screen.getByLabelText("Monday: Closes at"), { target: { value: "07:00" } });
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onAnswer).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("closing time must be after opening time");
  });

  it("summarizes the week with short day names", () => {
    const q = hoursQuestion(createProfile("restaurant", "en"));
    const lunch = [{ open: "08:00", close: "12:00" }, { open: "13:30", close: "17:30" }];
    const week = { mon: lunch, tue: lunch, wed: lunch, thu: lunch, fri: lunch, sat: [{ open: "08:00", close: "12:00" }] };
    expect(summarizeAnswer(q, week, i18n.t)).toBe("Mon-Fri 08:00-12:00, 13:30-17:30 · Sat 08:00-12:00 · Sun Closed");
    expect(summarizeAnswer(q, undefined, i18n.t)).toBe("");
  });
});
