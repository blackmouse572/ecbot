import { Input } from "@medusajs/ui";
import { useRef, useState } from "react";
import type { OTPInputType } from "./otp-input.types";
import { isAllowedChar, toDigits, typedChar } from "./otp-input.utils";

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

  // Follow the parent when it changes the code itself (a reset after a failed
  // verify), not when it is echoing what the user just typed.
  if (value !== prevValue) {
    setPrevValue(value);
    if (value !== undefined && value !== digits.join("")) {
      setDigits(toDigits(value, length));
    }
  }

  const update = (next: string[]) => {
    setDigits(next);
    const code = next.join("");
    onChange?.(code);
    if (next.every((digit) => digit !== "")) onComplete?.(code);
  };

  const focusBox = (index: number) => inputRefs.current[index]?.focus();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number,
  ) => {
    const char = typedChar(e.target.value, digits[index] ?? "");
    if (!isAllowedChar(char, type)) return;

    const next = [...digits];
    next[index] = char;
    update(next);
    if (index < length - 1) focusBox(index + 1);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
  ) => {
    if (e.key !== "Backspace") return;
    e.preventDefault();

    // Clear this box; on an empty box, step back and clear the previous one.
    const target = digits[index] || index === 0 ? index : index - 1;
    const next = [...digits];
    next[target] = "";
    update(next);
    focusBox(target);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const chars = e.clipboardData
      .getData("text/plain")
      .trim()
      .slice(0, length)
      .split("");
    if (!chars.length || !chars.every((char) => isAllowedChar(char, type))) {
      return;
    }

    const next = [...digits];
    chars.forEach((char, i) => (next[i] = char));
    update(next);
    focusBox(Math.min(chars.length, length - 1));
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
          onPaste={handlePaste}
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
