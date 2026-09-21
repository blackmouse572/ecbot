import { Input } from "@medusajs/ui";
import { isNumberOnly, isTextOnly } from "@repo/ui/utils";
import { useRef, useState } from "react";

interface OTPInputProps {
  /**
   * The length of the OTP input fields.
   * @default 5
   */
  length?: number;
  onComplete?: (otp: string) => void;
  onChange?: (otp: string) => void;
  value?: string;
  type?: "number" | "text" | "both";
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
  const [otp, setOtp] = useState<string[]>(
    value ? value.split("") : Array(length).fill(""),
  );
  const inputRefs = useRef<HTMLInputElement[]>([]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number,
  ) => {
    const value = e.target.value;

    // Only allow single digit
    if ((type === "number" || type === "both") && isNumberOnly(value)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);
      onChange?.(newOtp.join(""));

      // Auto-focus next input
      if (index < length - 1 && value) {
        inputRefs.current[index + 1]?.focus();
      }

      // Check if all fields are filled
      if (newOtp.every((digit) => digit !== "")) {
        onComplete?.(newOtp.join(""));
      }
    } else if ((type === "text" || type === "both") && isTextOnly(value)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);
      onChange?.(newOtp.join(""));
      // Auto-focus next input
      if (index < length - 1 && value) {
        inputRefs.current[index + 1]?.focus();
      }

      // Check if all fields are filled
      if (newOtp.every((digit) => digit !== "")) {
        onComplete?.(newOtp.join(""));
      }
    } else if (value === "") {
      // Clear the current input if backspace is pressed
      const newOtp = [...otp];
      newOtp[index] = "";
      setOtp(newOtp);
      onChange?.(newOtp.join(""));
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      // Move focus to previous input on backspace
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text/plain").slice(0, length);
    const validationRegex =
      type === "number"
        ? /^\d+$/
        : type === "text"
          ? /^[a-zA-Z]+$/
          : /^[a-zA-Z0-9]+$/;

    if (validationRegex.test(pasteData)) {
      const newOtp = [...otp];
      pasteData.split("").forEach((char, i) => {
        if (i < length) newOtp[i] = char;
      });
      setOtp(newOtp);
      onChange?.(newOtp.join(""));
      if (pasteData.length === length) {
        onComplete?.(pasteData);
      }
    }
  };

  return (
    <div className="flex gap-x-4">
      {Array.from({ length }).map((_, index) => (
        <Input
          key={`otp-input-${index}`}
          type="text"
          size={size}
          maxLength={1}
          value={otp[index]}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
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
