import { Input } from "@medusajs/ui";
import { useEffect, useRef, useState } from "react";
import type { OTPInputType } from "./otp-input.types";
import {
  allowedChars,
  isAllowedChar,
  toDigits,
  typedText,
} from "./otp-input.utils";

interface OTPInputProps {
  /**
   * The length of the OTP input fields.
   * @default 5
   */
  length?: number;
  onComplete?: (otp: string) => void;
  onChange?: (otp: string) => void;
  /** Pass it to control the boxes, e.g. set "" to clear them after a failed verify. */
  value?: string;
  type?: OTPInputType;
  size?: React.ComponentProps<typeof Input>["size"];
}

const OTPInput = ({
  length = 5,
  onComplete,
  onChange,
  value,
  type = "number",
  size = "base",
}: OTPInputProps) => {
  const [digits, setDigits] = useState(() => toDigits(value, length));
  const [prevValue, setPrevValue] = useState(value);
  const inputRefs = useRef<HTMLInputElement[]>([]);
  const focusFirstAfterReset = useRef(false);

  // Follow the parent when it changes the code itself (a reset after a failed
  // verify), not when it is echoing what the user just typed.
  if (value !== prevValue) {
    setPrevValue(value);
    if (value !== undefined && value !== digits.join("")) {
      setDigits(toDigits(value, length));
      focusFirstAfterReset.current = value === "";
    }
  }

  useEffect(() => {
    if (focusFirstAfterReset.current) {
      focusFirstAfterReset.current = false;
      inputRefs.current[0]?.focus();
    }
  });

  const focusBox = (index: number) => inputRefs.current[index]?.focus();

  const update = (next: string[]) => {
    setDigits(next);
    const code = next.join("");
    onChange?.(code);
    if (next.every((digit) => digit !== "")) onComplete?.(code);
  };

  /** Writes `chars` into the boxes from `index` on, then moves past them. */
  const fill = (index: number, chars: string[]) => {
    if (!chars.length) return;
    const next = [...digits];
    chars
      .slice(0, length - index)
      .forEach((char, i) => (next[index + i] = char));
    update(next);
    focusBox(Math.min(index + chars.length, length - 1));
  };

  const clear = (index: number) => {
    const next = [...digits];
    next[index] = "";
    update(next);
    focusBox(index);
  };

  // Keyboards with real keys: handled here so retyping the same digit, which
  // leaves the input's value unchanged, still moves on.
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
  ) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      // Clear this box; on an empty box, step back and clear the previous one.
      clear(digits[index] || index === 0 ? index : index - 1);
    } else if (e.key === "Delete") {
      e.preventDefault();
      clear(index);
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      if (isAllowedChar(e.key, type)) fill(index, [e.key]);
    }
  };

  // Everything that skips keydown: Android keyboards (key "Unidentified"),
  // SMS autofill writing the whole code into one box, cut.
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number,
  ) => {
    const text = typedText(e.target.value, digits[index] ?? "");
    if (!text) {
      clear(index);
      return;
    }
    fill(index, allowedChars(text, type));
  };

  const handlePaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    index: number,
  ) => {
    e.preventDefault();
    const chars = allowedChars(e.clipboardData.getData("text/plain"), type);
    // A whole code always starts at the first box, wherever it is pasted.
    fill(chars.length >= length ? 0 : index, chars);
  };

  return (
    <div className="flex gap-x-4">
      {Array.from({ length }).map((_, index) => (
        <Input
          key={`otp-input-${index}`}
          type="text"
          inputMode={type === "number" ? "numeric" : "text"}
          autoComplete={index === 0 ? "one-time-code" : "off"}
          size={size}
          value={digits[index]}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onFocus={(e) => e.target.select()}
          onPaste={(e) => handlePaste(e, index)}
          ref={(el) => {
            if (el) inputRefs.current[index] = el;
          }}
          className="aspect-square border-2 rounded-lg text-center focus:outline-none"
        />
      ))}
    </div>
  );
};

export { OTPInput };
