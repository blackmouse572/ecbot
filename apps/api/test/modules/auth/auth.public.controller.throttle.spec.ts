import { AuthPublicController } from 'src/modules/auth/controllers/auth.public.controller';

// Sign-up relied on Turnstile alone, and Turnstile switches itself off when
// its secret is missing. The cap is looser than login's: people sign up once,
// and a whole office can share one address.
describe('AuthPublicController throttling', () => {
    it.each([
        ['loginWithCredential', 5],
        ['signUp', 10],
    ] as const)('caps %s at %i per minute', (handlerName, limit) => {
        const handler = AuthPublicController.prototype[handlerName];

        expect(Reflect.getMetadata('THROTTLER:LIMITdefault', handler)).toBe(
            limit
        );
        expect(Reflect.getMetadata('THROTTLER:TTLdefault', handler)).toBe(
            60000
        );
    });
});
