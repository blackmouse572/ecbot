const VERIFICATION_EMAIL_TTL = 1000;

// Resend re-sends the active code while it has at least this long left, so a
// code from an earlier (slow) email keeps working; below it, a fresh code is
// issued so the new email never arrives already expired.
const VERIFICATION_EMAIL_RESEND_MIN_REMAINING_MS = 5 * 60 * 1000;

// Fresh codes a user can be issued per hour. Each allows 5 guesses, so
// without a cap a locked code could be swapped for a new one forever.
const VERIFICATION_EMAIL_REISSUE_MAX_PER_HOUR = 5;
const VERIFICATION_EMAIL_REISSUE_WINDOW_MS = 60 * 60 * 1000;

export {
    VERIFICATION_EMAIL_TTL,
    VERIFICATION_EMAIL_RESEND_MIN_REMAINING_MS,
    VERIFICATION_EMAIL_REISSUE_MAX_PER_HOUR,
    VERIFICATION_EMAIL_REISSUE_WINDOW_MS,
};
