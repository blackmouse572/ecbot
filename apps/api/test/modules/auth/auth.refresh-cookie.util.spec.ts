import { ENUM_APP_ENVIRONMENT } from '../../../src/app/enums/app.enum';
import {
    buildRefreshCookieOptions,
    refreshCookieSameSite,
} from '../../../src/modules/auth/utils/auth.refresh-cookie.util';

describe('buildRefreshCookieOptions', () => {
    it('sets maxAge (in ms) when rememberMe is true, for a persistent cookie', () => {
        const options = buildRefreshCookieOptions({
            sameSite: 'strict',
            maxAgeSeconds: 3600,
            rememberMe: true,
        });

        expect(options.maxAge).toBe(3600 * 1000);
    });

    it('omits maxAge when rememberMe is false, for a session-only cookie', () => {
        const options = buildRefreshCookieOptions({
            sameSite: 'strict',
            maxAgeSeconds: 3600,
            rememberMe: false,
        });

        expect(options).not.toHaveProperty('maxAge');
    });

    it('always sets httpOnly, secure and the given sameSite regardless of rememberMe', () => {
        const options = buildRefreshCookieOptions({
            sameSite: 'none',
            maxAgeSeconds: 3600,
            rememberMe: false,
        });

        expect(options).toMatchObject({
            httpOnly: true,
            secure: true,
            sameSite: 'none',
        });
    });
});

describe('refreshCookieSameSite', () => {
    it('is strict in production, where the app and the API share ecbot.dev', () => {
        expect(refreshCookieSameSite(ENUM_APP_ENVIRONMENT.PRODUCTION)).toBe(
            'strict'
        );
    });

    it('is none on staging, whose app (workers.dev) and API (run.app) are different sites', () => {
        expect(refreshCookieSameSite(ENUM_APP_ENVIRONMENT.STAGING)).toBe(
            'none'
        );
    });

    it('stays none locally, as before', () => {
        expect(refreshCookieSameSite(ENUM_APP_ENVIRONMENT.LOCAL)).toBe('none');
    });
});
