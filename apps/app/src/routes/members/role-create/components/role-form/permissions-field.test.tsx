import "@/i18n";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PermissionsField } from "./permissions-field";

const renderField = (value: object[]) => {
  const onChange = vi.fn();
  render(<PermissionsField value={value as never} onChange={onChange} />);
  return onChange;
};

describe("PermissionsField", () => {
  it("lists every area a custom role can be given", () => {
    renderField([]);

    for (const area of [
      "Agent",
      "Knowledge Base",
      "Customer",
      "Customer data",
      "Skills",
      "Tools",
      "Team",
      "API keys",
      "Workspace settings",
    ]) {
      expect(
        screen.getByRole("radiogroup", { name: area }),
      ).toBeInTheDocument();
    }
  });

  it("grants read only when View is picked", () => {
    const onChange = renderField([]);

    fireEvent.click(screen.getByRole("radio", { name: "Skills: View" }));

    expect(onChange).toHaveBeenCalledWith([
      { subject: "SKILL", action: ["read"] },
    ]);
  });

  it("switches an area to full access", () => {
    const onChange = renderField([{ subject: "TOOL", action: ["read"] }]);

    fireEvent.click(screen.getByRole("radio", { name: "Tools: Full access" }));

    expect(onChange).toHaveBeenCalledWith([
      { subject: "TOOL", action: ["manage"] },
    ]);
  });

  it("removes an area when No access is picked", () => {
    const onChange = renderField([
      { subject: "CHATBOT", action: ["manage"] },
      { subject: "TOOL", action: ["read"] },
    ]);

    fireEvent.click(screen.getByRole("radio", { name: "Agent: No access" }));

    expect(onChange).toHaveBeenCalledWith([
      { subject: "TOOL", action: ["read"] },
    ]);
  });
});
