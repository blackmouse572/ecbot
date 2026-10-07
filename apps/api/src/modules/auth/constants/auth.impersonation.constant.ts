export const AUTH_ALLOW_IMPERSONATION_META_KEY =
    'AuthAllowImpersonationMetaKey';

// HTTP methods that never change state. Everything else is refused for an
// impersonation token unless the handler opts in with @AllowImpersonation().
export const AUTH_IMPERSONATION_SAFE_METHODS: ReadonlySet<string> = new Set([
    'GET',
    'HEAD',
    'OPTIONS',
]);
