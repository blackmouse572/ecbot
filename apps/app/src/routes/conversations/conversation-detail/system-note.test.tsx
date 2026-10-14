import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import { SystemNote } from "./system-note";

describe("SystemNote", () => {
  it("shows the staff handled note in the reader's language, not the bot's text", () => {
    render(<SystemNote />);
    expect(
      screen.getByText("conversations.systemNote.handled"),
    ).toBeInTheDocument();
  });
});
