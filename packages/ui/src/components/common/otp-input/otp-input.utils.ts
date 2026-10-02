import type { OTPInputType } from "./otp-input.types";

const ALLOWED_CHAR: Record<OTPInputType, RegExp> = {
  number: /^\d$/,
  text: /^[a-zA-Z]$/,
  both: /^[a-zA-Z0-9]$/,
};

/** Splits a code into one slot per box, padding the missing ones with "". */
export const toDigits = (code: string | undefined, length: number) =>
  Array.from({ length }, (_, i) => code?.[i] ?? "");

export const isAllowedChar = (char: string, type: OTPInputType) =>
  ALLOWED_CHAR[type].test(char);

/**
 * The character the user just typed into a box that may already hold one:
 * "53" or "35" after typing 3 over 5 both give "3".
 */
export const typedChar = (raw: string, previous: string) =>
  (previous ? raw.replace(previous, "") : raw).slice(-1);
