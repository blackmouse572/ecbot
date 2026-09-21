import { forwardRef, useImperativeHandle, useRef } from "react";
import { OTPInput } from "./OTP-input";

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
}

const VerifyEmailForm = forwardRef<IVerifyEmailFormRef, IVerifyEmailFormProps>(
  ({ email, length, onVerify }, ref) => {
    const otpInputRef = useRef<React.ComponentRef<typeof OTPInput>>(null);

    const onComplete = async (otp: string) => {
      await onVerify?.(otp);
    };

    useImperativeHandle(ref, () => ({
      submit: () => {
        const otp: string = otpInputRef.current?.submit()?.join("") || "";
        return {
          otp,
        };
      },
    }));

    return (
      <OTPInput ref={otpInputRef} length={length} onComplete={onComplete} />
    );
  },
);

export { VerifyEmailForm };
