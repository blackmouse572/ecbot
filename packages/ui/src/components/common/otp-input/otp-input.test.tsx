import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { OTPInput } from "./otp-input";

const boxes = () => screen.getAllByRole("textbox") as HTMLInputElement[];
const box = (index: number) => boxes()[index]!;
const values = () => boxes().map((box) => box.value);

describe("OTPInput", () => {
  it("replaces a filled digit when the user types into its box", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<OTPInput length={3} onChange={onChange} />);

    await user.type(box(0), "123");
    await user.click(box(1));
    await user.keyboard("7");

    expect(values()).toEqual(["1", "7", "3"]);
    expect(onChange).toHaveBeenLastCalledWith("173");
  });

  it("clears the digit under the cursor on Backspace, then steps back", async () => {
    const user = userEvent.setup();
    render(<OTPInput length={3} />);

    await user.type(box(0), "123");
    await user.keyboard("{Backspace}");
    expect(values()).toEqual(["1", "2", ""]);

    await user.keyboard("{Backspace}");
    expect(values()).toEqual(["1", "", ""]);
    expect(box(1)).toHaveFocus();
  });

  it("ignores characters the type does not allow", async () => {
    const user = userEvent.setup();
    render(<OTPInput length={3} />);

    await user.type(box(0), "a");

    expect(values()).toEqual(["", "", ""]);
  });

  it("calls onComplete once every box is filled", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<OTPInput length={3} onComplete={onComplete} />);

    await user.type(box(0), "123");

    expect(onComplete).toHaveBeenCalledWith("123");
  });

  it("clears the boxes when the parent resets the value", async () => {
    const user = userEvent.setup();
    const Controlled = () => {
      const [code, setCode] = useState("");
      return (
        <>
          <OTPInput length={3} value={code} onChange={setCode} />
          <button onClick={() => setCode("")}>reset</button>
        </>
      );
    };
    render(<Controlled />);

    await user.type(box(0), "123");
    await user.click(screen.getByRole("button", { name: "reset" }));

    expect(values()).toEqual(["", "", ""]);
  });

  it("spreads a whole code typed into one box (SMS autofill)", () => {
    render(<OTPInput length={3} />);

    fireEvent.change(box(0), { target: { value: "123" } });

    expect(values()).toEqual(["1", "2", "3"]);
  });

  it("moves on when the same digit is retyped over a selected box", async () => {
    const user = userEvent.setup();
    render(<OTPInput length={3} />);

    await user.type(box(0), "123");
    await user.click(box(0));
    await user.keyboard("1");
    await user.keyboard("5");

    expect(values()).toEqual(["1", "5", "3"]);
  });

  it("clears a box on Delete", async () => {
    const user = userEvent.setup();
    render(<OTPInput length={3} />);

    await user.type(box(0), "123");
    await user.click(box(1));
    await user.keyboard("{Delete}");

    expect(values()).toEqual(["1", "", "3"]);
  });

  it("clears a box when its value is emptied without a Backspace key (Android, cut)", async () => {
    const user = userEvent.setup();
    render(<OTPInput length={3} />);

    await user.type(box(0), "123");
    fireEvent.change(box(1), { target: { value: "" } });

    expect(values()).toEqual(["1", "", "3"]);
  });

  it("pastes a code wrapped in other text", async () => {
    const user = userEvent.setup();
    render(<OTPInput length={3} />);

    await user.click(box(0));
    await user.paste("Mã: 1 2 3");

    expect(values()).toEqual(["1", "2", "3"]);
  });

  it("puts the cursor back in the first box when the parent clears the code", async () => {
    const user = userEvent.setup();
    const Controlled = () => {
      const [code, setCode] = useState("");
      return (
        <>
          <OTPInput length={3} value={code} onChange={setCode} />
          <button onClick={() => setCode("")}>reset</button>
        </>
      );
    };
    render(<Controlled />);

    await user.type(box(0), "123");
    await user.click(screen.getByRole("button", { name: "reset" }));

    expect(box(0)).toHaveFocus();
  });

  it("fills from the first box when a whole code is pasted anywhere", async () => {
    const user = userEvent.setup();
    render(<OTPInput length={3} />);

    await user.click(box(2));
    await user.paste("123");

    expect(values()).toEqual(["1", "2", "3"]);
  });
});
