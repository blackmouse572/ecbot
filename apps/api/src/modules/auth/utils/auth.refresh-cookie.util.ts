import { CookieOptions } from 'express';

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
