import "@/i18n";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TestChatNotice } from "./test-chat-notice";

describe("TestChatNotice", () => {
  it("tells the owner reminders and handoff only run on live channels", () => {
    render(<TestChatNotice />);
    expect(screen.getByText(/reminders and handoff to staff only work on live channels/i)).toBeInTheDocument();
  });
});
