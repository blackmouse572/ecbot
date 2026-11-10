import { CookieOptions } from 'express';
import { ENUM_APP_ENVIRONMENT } from 'src/app/enums/app.enum';

export interface IRefreshCookieOptionsInput {
    sameSite: CookieOptions['sameSite'];
    maxAgeSeconds: number;
    rememberMe: boolean;
}

/**
 * Cookie options for the refresh-token cookie. `rememberMe` decides
 * persistence only: checked -> `maxAge` so the cookie survives a browser
 * restart; unchecked -> a session cookie the browser drops on close. The
 * refresh JWT's own expiry (baked in at sign time) is unchanged either way.
 */
export function buildRefreshCookieOptions({
    sameSite,
    maxAgeSeconds,
    rememberMe,
}: IRefreshCookieOptionsInput): CookieOptions {
    return {
        httpOnly: true,
        secure: true,
        sameSite,
        ...(rememberMe ? { maxAge: maxAgeSeconds * 1000 } : {}),
    };
}

/**
 * SameSite for the refresh-token cookie. Strict needs the app and the API on
 * the same site (scheme + registrable domain), as in production (ecbot.dev).
 * On staging they are different sites (*.workers.dev and *.run.app), so a
 * strict cookie never reaches /auth/refresh and every session ends when the
 * access token expires. Local keeps the `none` it already had.
 */
export function refreshCookieSameSite(
    env: ENUM_APP_ENVIRONMENT
): CookieOptions['sameSite'] {
    return env === ENUM_APP_ENVIRONMENT.LOCAL ||
        env === ENUM_APP_ENVIRONMENT.STAGING
        ? 'none'
        : 'strict';
}
