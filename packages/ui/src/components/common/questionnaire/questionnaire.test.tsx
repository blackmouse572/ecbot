import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  Questionnaire, QuestionnaireActions, QuestionnaireChoice, QuestionnaireChoices,
  QuestionnaireError, QuestionnaireInput, QuestionnaireItem, QuestionnaireNext, QuestionnaireTitle,
} from "./questionnaire";

function Harness(props: { multiple?: boolean; required?: boolean; max?: number; disabled?: boolean; onSubmit?: () => void; text?: boolean }) {
  const [value, setValue] = useState<string | string[]>(props.multiple ? [] : "");
  return (
    <Questionnaire onSubmit={props.onSubmit ?? (() => {})}>
      <QuestionnaireItem name="q" value={value} onValueChange={setValue} multiple={props.multiple} required={props.required} max={props.max} disabled={props.disabled}>
        <QuestionnaireTitle>Pick</QuestionnaireTitle>
        {props.text ? (
          <QuestionnaireInput aria-label="answer" />
        ) : (
          <QuestionnaireChoices shortcuts="numbers">
            <QuestionnaireChoice value="a" label="Alpha" />
            <QuestionnaireChoice value="b" label="Beta" />
            <QuestionnaireChoice value="c" label="Gamma" />
          </QuestionnaireChoices>
        )}
        <QuestionnaireError>Required</QuestionnaireError>
      </QuestionnaireItem>
      <QuestionnaireActions><QuestionnaireNext>Next</QuestionnaireNext></QuestionnaireActions>
      <output data-testid="value">{JSON.stringify(value)}</output>
    </Questionnaire>
  );
}

describe("Questionnaire", () => {
  it("renders the title as a fieldset legend", () => {
    render(<Harness />);
    expect(screen.getByRole("group", { name: "Pick" })).toBeInTheDocument();
  });

  it("selects one choice in single mode", async () => {
    render(<Harness />);
    await userEvent.click(screen.getAllByRole("radio")[1]!);
    expect(screen.getByTestId("value").textContent).toBe('"b"');
  });

  it("toggles choices in multi mode and respects max", async () => {
    render(<Harness multiple max={2} />);
    const boxes = screen.getAllByRole("checkbox");
    await userEvent.click(boxes[0]!);
    await userEvent.click(boxes[1]!);
    await userEvent.click(boxes[2]!);
    expect(screen.getByTestId("value").textContent).toBe('["a","b"]');
    await userEvent.click(boxes[0]!);
    expect(screen.getByTestId("value").textContent).toBe('["b"]');
  });

  it("blocks submit and shows the error when a required item is empty", async () => {
    const onSubmit = vi.fn();
    render(<Harness required onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Required");
    await userEvent.click(screen.getAllByRole("radio")[0]!);
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it("picks a choice with number keys", async () => {
    render(<Harness multiple />);
    await userEvent.click(screen.getAllByRole("checkbox")[0]!);
    await userEvent.keyboard("3");
    expect(screen.getByTestId("value").textContent).toBe('["a","c"]');
  });

  it("does not render or validate a disabled item", async () => {
    const onSubmit = vi.fn();
    render(<Harness required disabled onSubmit={onSubmit} />);
    expect(screen.queryByRole("group", { name: "Pick" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it("binds a text input", async () => {
    render(<Harness text />);
    await userEvent.type(screen.getByLabelText("answer"), "hi");
    expect(screen.getByTestId("value").textContent).toBe('"hi"');
  });
});
