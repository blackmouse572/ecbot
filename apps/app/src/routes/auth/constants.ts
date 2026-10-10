// The API throttles verify and resend; its 429 message is a generic English
// "Too Many Request", so the auth pages show their own copy instead.
export const TOO_MANY_REQUESTS_STATUS = 429;

// Preselected on sign-up for the Vietnamese UI (the product's home market).
export const VIETNAM_ALPHA2_CODE = "VN";

// Wait before the forgot-password page offers Resend. The API allows 5 reset
// requests a minute, so one a minute stays well inside it.
export const RESEND_COOLDOWN_SECONDS = 60;

// Digits in an authenticator (TOTP) code on the login MFA step.
export const LOGIN_MFA_CODE_LENGTH = 6;

// API status codes that end the MFA step and send the person back to the
// password step: the challenge expired or was used (5021), or the account hit
// the failed-attempt lockout (5163).
export const LOGIN_MFA_RESTART_STATUS_CODES = [5021, 5163];
