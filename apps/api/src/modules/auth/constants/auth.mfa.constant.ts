// RFC 6238 TOTP parameters every mainstream authenticator app defaults to.
export const AUTH_MFA_TOTP_STEP_SECONDS = 30;
export const AUTH_MFA_TOTP_DIGITS = 6;
// Steps accepted either side of "now", to absorb clock drift.
export const AUTH_MFA_TOTP_WINDOW = 1;
export const AUTH_MFA_TOTP_SECRET_BYTES = 20;

export const AUTH_MFA_RECOVERY_CODE_COUNT = 10;
// 80 random bits per recovery code, shown as 16 base32 characters.
export const AUTH_MFA_RECOVERY_CODE_BYTES = 10;

// The challenge handed out after the password step; the second factor must
// be completed within this time.
export const AUTH_MFA_CHALLENGE_TTL_SECONDS = 300;

export const AUTH_MFA_DEFAULT_ISSUER = 'Eccho';

export const AUTH_MFA_CHALLENGE_KEY_PREFIX = 'auth:mfa:challenge';
