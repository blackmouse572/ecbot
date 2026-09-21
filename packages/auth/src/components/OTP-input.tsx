import { Input } from "@medusajs/ui";
import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { isNumberOnly } from "@repo/ui/utils";

interface OTPInputProps {
  /**
   * The length of the OTP input fields.
   * @default 5
   */
  length?: number;
  onComplete: (otp: string) => void;
}

interface OTPInputRef {
  /**
   *
   * @returns The current OTP value as a string.
   * This method can be used to retrieve the OTP value programmatically.
   */
  submit: () => string[];
}

const OTPInput = forwardRef<OTPInputRef, OTPInputProps>(
  ({ length = 5, onComplete }, ref) => {
    const [otp, setOtp] = useState<string[]>(() => Array(length).fill(""));
    const inputRefs = useRef<HTMLInputElement[]>([]);

    const handleChange = (
      e: React.ChangeEvent<HTMLInputElement>,
      index: number,
    ) => {
      const value = e.target.value;

      // Only allow single digit
      if (isNumberOnly(value)) {
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Auto-focus next input
        if (index < length - 1 && value) {
          inputRefs.current[index + 1]?.focus();
        }

        // Check if all fields are filled
        if (newOtp.every((digit) => digit !== "")) {
          onComplete(newOtp.join(""));
        }
      } else if (value === "") {
        // Clear the current input if backspace is pressed
        const newOtp = [...otp];
        newOtp[index] = "";
        setOtp(newOtp);
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
      if (/^\d+$/.test(pasteData)) {
        const newOtp = [...otp];
        pasteData.split("").forEach((char, i) => {
          if (i < length) newOtp[i] = char;
        });
        setOtp(newOtp);
        if (pasteData.length === length) {
          onComplete(pasteData);
        }
      }
    };

    useImperativeHandle(ref, () => ({
      submit: () => {
        return otp;
      },
    }));

    return (
      <div className="flex gap-x-4">
        {Array.from({ length }).map((_, index) => (
          <Input
            key={`otp-input-${index}`}
            type="text"
            maxLength={1}
            value={otp[index]}
            onChange={(e) => handleChange(e, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            onPaste={handlePaste}
            ref={(el) => {
              if (el) inputRefs.current[index] = el;
            }}
            className="w-12 h-12 border-2 border-gray-300 rounded-lg text-center text-xl focus:border-blue-500 focus:outline-none"
          />
        ))}
      </div>
    );
  },
);

export { OTPInput };
