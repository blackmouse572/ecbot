import { OTPInput } from "@repo/ui/common-components";
import { forwardRef, useImperativeHandle, useState } from "react";

interface IVerifyEmailFormProps extends Pick<
  React.ComponentProps<typeof OTPInput>,
  "length"
> {
  email: string;

  /**
   * Function to handle the verification of the email.
   * If passed, it will be called with the OTP automatically when the OTP input is completed.
   */
  onVerify?: (number: string) => Promise<void>;
}

interface IVerifyEmailFormRef {
  submit: () => {
    otp: string;
  };
  /** Empties the boxes, e.g. after a wrong code. */
  reset: () => void;
}

const VerifyEmailForm = forwardRef<IVerifyEmailFormRef, IVerifyEmailFormProps>(
  ({ length, onVerify }, ref) => {
    const [otp, setOtp] = useState("");

    const onComplete = async (code: string) => {
      await onVerify?.(code);
    };

    useImperativeHandle(ref, () => ({
      submit: () => ({ otp }),
      reset: () => setOtp(""),
    }));

    return (
      <OTPInput
        length={length}
        value={otp}
        onChange={setOtp}
        onComplete={onComplete}
      />
    );
  },
);

export { VerifyEmailForm };
