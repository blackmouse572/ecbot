import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import {
    AUTH_MFA_TOTP_DIGITS,
    AUTH_MFA_TOTP_SECRET_BYTES,
    AUTH_MFA_TOTP_STEP_SECONDS,
    AUTH_MFA_TOTP_WINDOW,
} from 'src/modules/auth/constants/auth.mfa.constant';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buffer: Buffer): string {
    let bits = 0;
    let value = 0;
    let output = '';
    for (const byte of buffer) {
        value = (value << 8) | byte;
        bits += 8;
        while (bits >= 5) {
            output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }
    if (bits > 0) {
        output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
    }
    return output;
}

export function base32Decode(input: string): Buffer {
    const clean = input.toUpperCase().replace(/[\s=]/g, '');
    let bits = 0;
    let value = 0;
    const bytes: number[] = [];
    for (const char of clean) {
        const index = BASE32_ALPHABET.indexOf(char);
        if (index === -1) {
            throw new Error('Invalid base32 character');
        }
        value = (value << 5) | index;
        bits += 5;
        if (bits >= 8) {
            bytes.push((value >>> (bits - 8)) & 255);
            bits -= 8;
        }
    }
    return Buffer.from(bytes);
}

export function generateTotpSecret(): string {
    return base32Encode(randomBytes(AUTH_MFA_TOTP_SECRET_BYTES));
}

function hotp(key: Buffer, counter: number): string {
    const message = Buffer.alloc(8);
    message.writeBigUInt64BE(BigInt(counter));
    const hmac = createHmac('sha1', key).update(message).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const binary = hmac.readUInt32BE(offset) & 0x7fffffff;
    return (binary % 10 ** AUTH_MFA_TOTP_DIGITS)
        .toString()
        .padStart(AUTH_MFA_TOTP_DIGITS, '0');
}

function timeStep(nowMs: number): number {
    return Math.floor(nowMs / 1000 / AUTH_MFA_TOTP_STEP_SECONDS);
}

export function generateTotp(secret: string, nowMs: number): string {
    return hotp(base32Decode(secret), timeStep(nowMs));
}

/**
 * Returns the matched time step, or null. A step at or before
 * `lastUsedStep` is refused so one code can never be replayed (RFC 6238 §5.2).
 * Every window step is checked, so timing does not reveal which one matched.
 */
export function verifyTotp(
    secret: string,
    code: string,
    nowMs: number,
    lastUsedStep?: number | null
): number | null {
    if (!new RegExp(`^\\d{${AUTH_MFA_TOTP_DIGITS}}$`).test(code)) {
        return null;
    }

    const key = base32Decode(secret);
    const current = timeStep(nowMs);
    const given = Buffer.from(code);
    let matched: number | null = null;
    for (
        let step = current - AUTH_MFA_TOTP_WINDOW;
        step <= current + AUTH_MFA_TOTP_WINDOW;
        step++
    ) {
        if (timingSafeEqual(Buffer.from(hotp(key, step)), given)) {
            matched = step;
        }
    }

    if (matched === null) return null;
    if (lastUsedStep != null && matched <= lastUsedStep) return null;
    return matched;
}

export function buildOtpauthUri(
    secret: string,
    account: string,
    issuer: string
): string {
    const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`;
    const params = new URLSearchParams({
        secret,
        issuer,
        algorithm: 'SHA1',
        digits: String(AUTH_MFA_TOTP_DIGITS),
        period: String(AUTH_MFA_TOTP_STEP_SECONDS),
    });
    return `otpauth://totp/${label}?${params.toString()}`;
}
