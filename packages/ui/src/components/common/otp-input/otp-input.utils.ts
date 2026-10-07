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

/** The characters of `text` a box accepts, e.g. "Mã: 1 2 3" gives ["1","2","3"]. */
export const allowedChars = (text: string, type: OTPInputType) =>
  text.split("").filter((char) => isAllowedChar(char, type));

/**
 * What the user just put into a box that may already hold a character:
 * "53" after typing 3 over 5 gives "3"; a whole code autofilled into one box
 * ("123456") is kept whole so it can be spread over the boxes.
 */
export const typedText = (raw: string, previous: string) =>
  previous && raw.length > 1 ? raw.replace(previous, "") : raw;
