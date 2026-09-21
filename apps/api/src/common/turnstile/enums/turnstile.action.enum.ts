/**
 * Per-form Turnstile action. Sent by the widget and echoed back by siteverify,
 * so a token solved on one form cannot be replayed against another.
 *
 * These strings MUST match the `action` passed to the widget in
 * `packages/auth/src/components/turnstile.tsx` and
 * `apps/web/app/[locale]/_components/waitlist-form.tsx`.
 */
export enum ENUM_TURNSTILE_ACTION {
    LOGIN = 'login',
    SIGN_UP = 'sign-up',
    WAITLIST = 'waitlist',
    CHATBOT_PREVIEW = 'chatbot-preview',
    WEBSITE_WIDGET = 'website-widget',
}
