import { buildRefreshCookieOptions } from '../../../src/modules/auth/utils/auth.refresh-cookie.util';

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
