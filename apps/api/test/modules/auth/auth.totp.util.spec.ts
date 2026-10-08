import {
    base32Decode,
    base32Encode,
    buildOtpauthUri,
    generateTotp,
    generateTotpSecret,
    verifyTotp,
} from '@app/modules/auth/utils/auth.totp.util';

// RFC 6238 Appendix B, SHA-1 seed "12345678901234567890". The RFC lists
// 8-digit codes; a 6-digit code is the last 6 digits of the same value.
const RFC_SECRET = base32Encode(Buffer.from('12345678901234567890', 'ascii'));
const RFC_VECTORS: [number, string][] = [
    [59, '287082'],
    [1111111109, '081804'],
    [1111111111, '050471'],
    [1234567890, '005924'],
    [2000000000, '279037'],
    [20000000000, '353130'],
];

describe('auth.totp.util', () => {
    it('encodes the RFC seed to the well-known base32 string', () => {
        expect(RFC_SECRET).toBe('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
        expect(base32Decode(RFC_SECRET).toString('ascii')).toBe(
            '12345678901234567890'
        );
    });

    it.each(RFC_VECTORS)('matches the RFC 6238 vector at T=%i', (t, code) => {
        expect(generateTotp(RFC_SECRET, t * 1000)).toBe(code);
    });

    it('accepts the current step and one step either side, and returns it', () => {
        const now = 1111111111 * 1000;
        const step = Math.floor(1111111111 / 30);
        expect(verifyTotp(RFC_SECRET, '050471', now)).toBe(step);
        expect(
            verifyTotp(RFC_SECRET, generateTotp(RFC_SECRET, now - 30000), now)
        ).toBe(step - 1);
        expect(
            verifyTotp(RFC_SECRET, generateTotp(RFC_SECRET, now + 30000), now)
        ).toBe(step + 1);
    });

    it('rejects a code two steps away, a malformed code, and a replayed step', () => {
        const now = 1111111111 * 1000;
        const step = Math.floor(1111111111 / 30);
        expect(
            verifyTotp(RFC_SECRET, generateTotp(RFC_SECRET, now - 60000), now)
        ).toBeNull();
        expect(verifyTotp(RFC_SECRET, '12345', now)).toBeNull();
        expect(verifyTotp(RFC_SECRET, 'abcdef', now)).toBeNull();
        expect(verifyTotp(RFC_SECRET, '050471', now, step)).toBeNull();
    });

    it('generates a 160-bit base32 secret and an otpauth URI', () => {
        const secret = generateTotpSecret();
        expect(secret).toMatch(/^[A-Z2-7]{32}$/);
        expect(base32Decode(secret)).toHaveLength(20);

        const uri = buildOtpauthUri(secret, 'a@b.com', 'Eccho');
        expect(uri).toBe(
            `otpauth://totp/Eccho:a%40b.com?secret=${secret}&issuer=Eccho&algorithm=SHA1&digits=6&period=30`
        );
    });
});
