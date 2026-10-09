export const USER_GUARD_EMAIL_VERIFIED_META_KEY =
    'UserGuardEmailVerifiedMetaKey';

// Version of the Terms of Service and Privacy Policy a new user accepts at
// sign-up (the effective date on the docs pages). Bump it when either changes.
export const USER_TERMS_VERSION = '2026-10-08';

// Whether existing users are asked to accept USER_TERMS_VERSION after login.
// Off while the Terms and Privacy Policy are drafts: consent to a draft binds
// no one and would need asking again. Turn it on, together with a new
// USER_TERMS_VERSION, once counsel signs the documents off.
export const USER_TERMS_PROMPT_ENABLED: boolean = false;
